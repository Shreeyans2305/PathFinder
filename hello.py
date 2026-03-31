from fastapi import FastAPI
app = FastAPI()


@app.get("/health")
async def root():
    return {"Server Running!"}

@app.get("/items/{item_id}")
async def read_item(item_id:int):
    return {"Your item id is: ": item_id}

@app.get("/times/5/{your_number}")
async def times5(your_number:int):
    return {"Answer":your_number*5}