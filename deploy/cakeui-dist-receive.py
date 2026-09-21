#!/usr/bin/python3 -I
"""Restricted SSH receiver for CakeUI browser assets; installed root-owned."""

import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile

ROOT = Path('/var/www/html/cakeui-dist')
VERSION = re.compile(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?')


def validate(payload):
    version = payload.get('version', '')
    source = payload.get('source')
    if not isinstance(version, str) or not VERSION.fullmatch(version) or source not in ('npm', 'preview'):
        raise ValueError('Invalid version or source')
    integrity = payload.get('integrity')
    if source == 'npm' and (not isinstance(integrity, str) or not re.fullmatch(r'sha512-[A-Za-z0-9+/]{86}==', integrity)):
        raise ValueError('Missing npm package integrity')
    if source == 'preview' and integrity is not None:
        raise ValueError('Preview cannot claim npm provenance')
    files = payload.get('files', {})
    if set(files) != {'cakeui.min.js', 'cakeui.css'}:
        raise ValueError('Only the two browser assets can be deployed')
    decoded = {}
    for name, item in files.items():
        data = base64.b64decode(item['data'], validate=True)
        if not 0 < len(data) < 4 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != item['sha256']:
            raise ValueError('Asset digest or size mismatch')
        decoded[name] = data
    manifest = {
        'name': '@a1knla/cakeui', 'version': version, 'source': source, 'integrity': integrity,
        'files': {name: files[name]['sha256'] for name in sorted(files)},
    }
    return manifest, decoded


def switch_link(path, target):
    if os.path.lexists(path) and not path.is_symlink():
        raise ValueError('Refusing to replace a non-symlink publication path')
    temporary = path.with_name(path.name + '.pending')
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(target)
    temporary.replace(path)


def install(root, manifest, files):
    for name in ('cakeui.min.js', 'cakeui.css', 'manifest.json'):
        public = root / name
        if os.path.lexists(public) and (not public.is_symlink() or os.readlink(public) != 'current/' + name):
            raise ValueError('Unexpected public asset path')
    encoded = json.dumps(manifest, sort_keys=True, ensure_ascii=False).encode() + b'\n'
    preview = manifest['source'] == 'preview'
    release = ('previews/' + hashlib.sha256(encoded).hexdigest()[:16]) if preview else ('releases/' + manifest['version'])
    destination = root / release
    if destination.exists():
        if destination.is_symlink() or (destination / 'manifest.json').read_bytes() != encoded:
            raise ValueError('Existing release is immutable')
        for name, data in files.items():
            if (destination / name).read_bytes() != data:
                raise ValueError('Existing release content mismatch')
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = Path(tempfile.mkdtemp(prefix='.incoming-', dir=destination.parent))
        try:
            for name, data in {**files, 'manifest.json': encoded}.items():
                (temporary / name).write_bytes(data)
                (temporary / name).chmod(0o644)
            temporary.chmod(0o755)
            temporary.rename(destination)
        finally:
            if temporary.exists():
                shutil.rmtree(temporary)
    channel = 'next' if not preview and '-' in manifest['version'] else 'current'
    current = root / channel
    # A source preview may bootstrap an empty distribution, but cannot replace npm stable.
    if preview and os.path.lexists(current) and (not current.is_symlink() or not os.readlink(current).startswith('previews/')):
        channel = 'preview-only'
    else:
        switch_link(current, release)
    for name in ('cakeui.min.js', 'cakeui.css', 'manifest.json'):
        public = root / name
        if not os.path.lexists(public):
            public.symlink_to('current/' + name)
    return {'path': release, 'channel': channel, 'version': manifest['version']}


def main():
    command = os.environ.get('SSH_ORIGINAL_COMMAND')
    if command is None:
        command = '/usr/local/libexec/cakeui-dist-receive ' + ' '.join(sys.argv[1:])
    if command == '/usr/local/libexec/cakeui-dist-receive check':
        if not ROOT.is_dir() or not os.access(ROOT, os.W_OK):
            raise ValueError('Distribution directory is not writable')
        print(json.dumps({'ready': True, 'directory': str(ROOT)}))
        return
    if command != '/usr/local/libexec/cakeui-dist-receive publish':
        raise ValueError('Only CakeUI browser publication is permitted')
    raw = sys.stdin.buffer.read(12 * 1024 * 1024 + 1)
    if len(raw) > 12 * 1024 * 1024:
        raise ValueError('Payload too large')
    manifest, files = validate(json.loads(raw))
    cache = Path.home() / '.cache'
    cache.mkdir(exist_ok=True)
    with (cache / 'cakeui-dist.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        print(json.dumps(install(ROOT, manifest, files)))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        print('CakeUI deployment rejected: ' + str(error), file=sys.stderr)
        sys.exit(1)
