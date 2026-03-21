import sys
sys.path.append('c:\\Projects\\Veridian and  Direction')
from backend.api import app
from fastapi.testclient import TestClient

client = TestClient(app)
res = client.get('/api/v1/predict/meta-ensemble')
with open('test_meta_out.json', 'w') as f:
    f.write(res.text)
print("done")
