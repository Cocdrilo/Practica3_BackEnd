import {MongoClient, ObjectId} from "npm:mongodb"

const url = Deno.env.get('MONGO_DB')

if(!url){
    console.error('Url inválida')
    Deno.exit(-1)
}

const client = new MongoClient(url)
await client.connect()

const db = await client.db('KidsAndPlaces')

//const kidCollection = db.collection<bookModel>('Libros')
//const placesCollection = db.collection<autorModel>('Autores')


const handler = async (req:Request):Promise<Response> =>{
    const method = req.method
    const url = new URL(req.url)
    const path = url.pathname

    return new Response('Endpoint Not Found',{status:401})
}


Deno.serve({port:8080},handler)