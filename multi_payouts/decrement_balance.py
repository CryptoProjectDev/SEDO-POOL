import json
import redis

r = redis.Redis(host='127.0.0.1')
def decrement(pub, amount):
  satoshis = amount*1E8
  data = r.hget("miner_data",pub)
  print('before',data)
  data = json.loads(data.decode())
  data['tokenBalance'] -= satoshis
  r.hset("miner_data",pub,json.dumps(data).encode())
  print('after',data)

  

if __name__=="__main__":
  decrement("0x60840139BcDF5C349Bb902c21E2A1FcF655a1291", 10)
