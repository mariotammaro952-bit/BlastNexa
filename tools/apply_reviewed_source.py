"""Materialize a reviewed text delta without transporting the embedded media again.

The base and final SHA-256 checks make this a one-shot source import, never a
best-effort patch against an unrelated version. Generated Android assets use
the identical HTML bytes. The build commits the materialized source before QA.
"""
from pathlib import Path
import hashlib
import json

root=Path(__file__).resolve().parents[1]
patch=root/'.github/reviewed-source-v28.json'
if not patch.exists():
    print('No pending reviewed source import.')
else:
    spec=json.loads(patch.read_text())
    target=root/'game/index.html'
    data=target.read_bytes()
    digest=lambda value:hashlib.sha256(value).hexdigest()
    if digest(data)!=spec['result_sha256']:
        assert digest(data)==spec['base_sha256'], 'Reviewed source base changed; refusing to overwrite it'
        text=data.decode('utf-8')
        for edit in reversed(spec['edits']):
            start=edit['start'];end=start+edit['remove']
            assert 0<=start<=end<=len(text)
            text=text[:start]+edit['text']+text[end:]
        data=text.encode('utf-8')
        assert digest(data)==spec['result_sha256'], 'Reviewed source result hash mismatch'
        target.write_bytes(data)
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==spec['result_git_blob']
    (root/'app/src/main/assets/index.html').write_bytes(data)
    print('Reviewed source verified:',spec['result_sha256'])
