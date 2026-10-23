from pathlib import Path
import sys,zipfile,json,hashlib
old,new=map(Path,sys.argv[1:3])
with zipfile.ZipFile(old)as a,zipfile.ZipFile(new)as b:
 names={n for n in a.namelist()if not n.startswith('META-INF/')and not n.endswith('/')}
 assert names=={n for n in b.namelist()if not n.startswith('META-INF/')and not n.endswith('/')}
 different=[n for n in names if a.read(n)!=b.read(n)]
 assert not different,'App payload changed: '+str(different)
 print(json.dumps({'allNonSignatureZipEntriesIdentical':True,'entries':len(names),'dexEntries':sorted(n for n in names if n.endswith('.dex')),'oldApkSha256':hashlib.sha256(old.read_bytes()).hexdigest(),'newApkSha256':hashlib.sha256(new.read_bytes()).hexdigest()}))
