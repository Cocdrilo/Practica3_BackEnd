import {MongoClient, ObjectId} from "npm:mongodb"
import {kidModel, placesModel} from "./types.ts";

const url = Deno.env.get('MONGO_DB')

if(!url){
    console.error('Url inválida')
    Deno.exit(-1)
}

const client = new MongoClient(url)
await client.connect()

const db = await client.db('KidsAndPlaces')

const kidCollection = db.collection<kidModel>('kids')
const placesCollection = db.collection<placesModel>('places')

const checkCoordsReal = (coord1 : number,coord2:number):boolean => {

    //long entre -180 & 180   lat entre -90 & 90
    if(coord1 >= -90 && coord1 <= 90 && coord2 >= -180 && coord2 <= 180){
        return true
    }else{
        return false
    }
}


const handler = async (req:Request):Promise<Response> =>{
    const method = req.method
    const url = new URL(req.url)
    const path = url.pathname

    if(method === 'POST'){
        if(path === '/ubicacion'){
            const ubicacion = await req.json()
            if(!ubicacion.coordenadas || ubicacion.nombre || ubicacion.numNiñosBuenos){
                return new Response('error: Faltan datos en el cuerpo de la solicitud de Post',{status:400})
            }
            if(checkCoordsReal(ubicacion.coordenadas))
        }
    }

    return new Response('Endpoint Not Found',{status:401})
}


Deno.serve({port:6768},handler)