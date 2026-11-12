import base64
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

# This receiver and its filesystem tests target the Ubuntu deployment host.
spec = importlib.util.spec_from_file_location('receiver', Path(__file__).parent.parent / 'deploy/cakeui-dist-receive.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)


def payload(version='1.2.3', source='npm'):
    files = {'cakeui.min.js': b'window.CakeUI = {}', 'cakeui.css': b'.cake-slide {}'}
    return {'version': version, 'source': source, 'integrity': 'sha512-' + base64.b64encode(bytes(64)).decode() if source == 'npm' else None,
            'files': {name: {'data': base64.b64encode(data).decode(), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in files.items()}}


class ReceiverTests(unittest.TestCase):
    def test_invalid_payloads_are_rejected(self):
        for version in ('../other', '1.0.0\n', '1.0.0/../../other', '01.0.0'):
            with self.assertRaises(ValueError):
                receiver.validate(payload(version))
        damaged = payload()
        damaged['files']['cakeui.css']['sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            receiver.validate(damaged)
        extra = payload()
        extra['files']['../other'] = extra['files']['cakeui.css']
        with self.assertRaises(ValueError):
            receiver.validate(extra)
        missing_integrity = payload()
        missing_integrity['integrity'] = None
        with self.assertRaises(ValueError):
            receiver.validate(missing_integrity)

    def test_atomic_channels_immutability_and_idempotent_retries(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            first = receiver.install(root, *receiver.validate(payload('0.3.0', 'preview')))
            self.assertEqual(first['channel'], 'current')
            stable = receiver.install(root, *receiver.validate(payload()))
            self.assertEqual(os.readlink(root / 'current'), 'releases/1.2.3')
            self.assertEqual((root / 'cakeui.css').read_bytes(), b'.cake-slide {}')
            self.assertEqual(receiver.install(root, *receiver.validate(payload())), stable)
            newer_preview = payload('1.3.0', 'preview')
            self.assertEqual(receiver.install(root, *receiver.validate(newer_preview))['channel'], 'preview-only')
            receiver.install(root, *receiver.validate(payload('1.3.0-beta.1')))
            self.assertEqual(os.readlink(root / 'current'), 'releases/1.2.3')
            self.assertEqual(os.readlink(root / 'next'), 'releases/1.3.0-beta.1')
            manifest, files = receiver.validate(payload())
            changed = copy.deepcopy(manifest)
            changed['files']['cakeui.css'] = hashlib.sha256(b'changed').hexdigest()
            with self.assertRaises(ValueError):
                receiver.install(root, changed, {**files, 'cakeui.css': b'changed'})
            self.assertEqual(json.loads((root / 'manifest.json').read_text())['version'], '1.2.3')

    def test_existing_unrelated_file_is_preserved_before_promotion(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'cakeui.css').write_text('existing')
            with self.assertRaises(ValueError):
                receiver.install(root, *receiver.validate(payload()))
            self.assertFalse((root / 'current').exists())
            self.assertEqual((root / 'cakeui.css').read_text(), 'existing')


if __name__ == '__main__':
    unittest.main()
