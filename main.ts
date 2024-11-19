import {MongoClient, ObjectId} from "npm:mongodb"
import {kidModel, placesModel} from "./types.ts";
import {convertplacesModelToPlace} from "./utils.ts";

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

const haversine = (lat1:number, lon1:number, lat2:number, lon2:number):number => {
    const R = 6371 // Radio de la Tierra en km
    const toRad = (deg:number) => (deg * Math.PI) / 180 // Conversión a radianes
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const lat1Rad = toRad(lat1)
    const lat2Rad = toRad(lat2)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distancia en km
}


const handler = async (req:Request):Promise<Response> =>{
    const method = req.method
    const url = new URL(req.url)
    const path = url.pathname

    if(method === 'POST'){
        if(path === '/ubicacion'){
            const ubicacion = await req.json()
            console.log(ubicacion)
            if(!ubicacion.coordenadas || !ubicacion.name || !ubicacion.goodKids){
                return new Response('error: Faltan datos en el cuerpo de la solicitud de Post',{status:400})
            }
            if(!checkCoordsReal(ubicacion.coordenadas[0],ubicacion.coordenadas[1])){
                return new Response('error : Las coordenadas no existen o son incorrectas',{status:400})
            }
            const ubicationName = ubicacion.name
            const checkUbicacionName = await placesCollection.findOne({name:ubicationName})

            if(!checkUbicacionName){
                const newPlace:placesModel = {
                  _id: new ObjectId(),
                  name: ubicacion.name,
                  coordenadas: ubicacion.coordenadas,
                  goodKids: ubicacion.goodKids
                }
                const añadirNewPlace = await placesCollection.insertOne(newPlace)

                const response = {
                    message : "Ubicacion Creada con exito",
                    ubicacion : await convertplacesModelToPlace(newPlace)
                }

                return new Response(JSON.stringify(response),{status:201,headers:{"Content-Type":"application/json"},})
            }else{
                return new Response('Nombre de ubicación ya existente',{status:409})
            }
        }else if (path === '/ninos') {
            const nino = await req.json()
            console.log(nino)
            if(!nino.nombre || !nino.comportamiento || !nino.ubicacion ){
                return new Response('error: Faltan datos en el cuerpo de la solicitud de Post',{status:400})
            }
            const checkNombre = await kidCollection.findOne({nombre:nino.nombre})

            if(checkNombre){
                return new Response('Nombre de niño ya existente',{status:409})
            }
            const checkUbicacion = await placesCollection.findOne({_id:new ObjectId(nino.ubicacion)})
            if(!checkUbicacion){
                return new Response('Ubicacion no existe',{status:404})
            }
            const newKid:kidModel = {
                _id: new ObjectId(),
                nombre: nino.nombre,
                comportamiento: nino.comportamiento,
                ubicacion: nino.ubicacion
            }

            const añadirNewKid = await kidCollection.insertOne(newKid)
            const response = {
                message : "Niño Creado con exito",
                niño : newKid
            }
            return new Response(JSON.stringify(response),{status:201,headers:{"Content-Type":"application/json"},})
        }

    }else if (method === 'GET'){
        if(path === '/ninos/buenos'){
            const goodKids = await kidCollection.find({comportamiento:'good'}).toArray()
            const response = {
                message : "Niños Buenos",
                niños : goodKids
            }
            return new Response(JSON.stringify(response),{status:200,headers:{"Content-Type":"application/json"},})
        }else if(path === '/ninos/malos'){
            const badKids = await kidCollection.find({comportamiento:'bad'}).toArray()
            const response = {
                message : "Niños Malos",
                niños : badKids
            }
            return new Response(JSON.stringify(response),{status:200,headers:{"Content-Type":"application/json"},})
        }
        else if (path === '/entregas'){
            //Devuelve las ubicaciones ordenads de mayor a menor por el numero de niños buenos el sort (-1) para el orden descendente
            const places = await placesCollection.find().sort({goodKids:-1}).toArray()
            const response = {
                message : "Ubicaciones ordenadas por el numero de niños buenos",
                ubicaciones : places
            }
            return new Response(JSON.stringify(response),{status:200,headers:{"Content-Type":"application/json"},})
        }
        else if (path === '/ruta'){
            //devuelve la distancia total a recorrer por santa Claus , calcula las distancias entre las ubicaciones ordenadas de mayor a menor cantidad de niños buenos, usa la formula de haversine para par de ibucaciones y devuelve en kilometros
            const places = await placesCollection.find().sort({goodKids:-1}).toArray()
            let distance = 0
            for(let i = 0; i < places.length - 1; i++){
                distance += haversine(places[i].coordenadas[0],places[i].coordenadas[1],places[i+1].coordenadas[0],places[i+1].coordenadas[1])
            }
            const response = {
                message : "Distancia total a recorrer por Santa Claus",
                distancia : distance
            }
            return new Response(JSON.stringify(response),{status:200,headers:{"Content-Type":"application/json"},})
        }
    }

    return new Response('Endpoint Not Found',{status:401})
}


Deno.serve({port:8080},handler)