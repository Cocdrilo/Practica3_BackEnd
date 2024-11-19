import { MongoClient, ObjectId } from "npm:mongodb";
import { goodOrBad, kidModel, placesModel } from "./types.ts";
import { convertplacesModelToPlace } from "./utils.ts";

const url = Deno.env.get('MONGO_DB');
if (!url) {
    console.error('Url inválida');
    Deno.exit(-1);
}

const client = new MongoClient(url);
await client.connect();
const db = await client.db('KidsAndPlaces');
const kidCollection = db.collection<kidModel>('kids');
const placesCollection = db.collection<placesModel>('places');

const checkCoordsReal = (coord1: number, coord2: number): boolean => {
    return coord1 >= -90 && coord1 <= 90 && coord2 >= -180 && coord2 <= 180;
};

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const checkKidExists = async (nombre: string) => {
    return await kidCollection.findOne({ nombre });
};

const checkPlaceExists = async (placeId: string) => {
    return await placesCollection.findOne({ _id: new ObjectId(placeId) });
};

const getGoodKidsByPlace = async () => {
    const kids = await kidCollection.find({ comportamiento: goodOrBad.good }).toArray();
    const places = await placesCollection.find().toArray();
    return places.map(place => {
        const kidsInPlace = kids.filter(kid => kid.ubicacion.toString() === place._id.toString());
        return {
            place: place,
            kids: kidsInPlace,
            count: kidsInPlace.length,
        };
    });
};

const handler = async (req: Request): Promise<Response> => {
    const method = req.method;
    const url = new URL(req.url);
    const path = url.pathname;

    if (method === 'POST') {
        if (path === '/ubicacion') {
            const ubicacion = await req.json();
            if (!ubicacion.coordenadas || !ubicacion.name) {
                return new Response('error: Faltan datos en el cuerpo de la solicitud de Post', { status: 400 });
            }
            if (!checkCoordsReal(ubicacion.coordenadas[0], ubicacion.coordenadas[1])) {
                return new Response('error: Las coordenadas no existen o son incorrectas', { status: 400 });
            }

            const checkUbicacionName = await placesCollection.findOne({ name: ubicacion.name });
            if (!checkUbicacionName) {
                const newPlace: placesModel = {
                    _id: new ObjectId(),
                    name: ubicacion.name,
                    coordenadas: ubicacion.coordenadas,
                };
                await placesCollection.insertOne(newPlace);
                const response = {
                    message: "Ubicacion Creada con exito",
                    ubicacion: await convertplacesModelToPlace(newPlace),
                };
                return new Response(JSON.stringify(response), { status: 201, headers: { "Content-Type": "application/json" } });
            } else {
                return new Response('Nombre de ubicación ya existente', { status: 409 });
            }
        } else if (path === '/ninos') {
            const nino = await req.json();
            if (!nino.nombre || !nino.comportamiento || !nino.ubicacion) {
                return new Response('error: Faltan datos en el cuerpo de la solicitud de Post', { status: 400 });
            }

            if (![goodOrBad.good, goodOrBad.bad].includes(nino.comportamiento)) {
                return new Response('error: Comportamiento inválido. Debe ser "good" o "bad".', { status: 400 });
            }

            const checkNombre = await checkKidExists(nino.nombre);
            if (checkNombre) {
                return new Response('Nombre de niño ya existente', { status: 409 });
            }

            const checkUbicacion = await checkPlaceExists(nino.ubicacion);
            if (!checkUbicacion) {
                return new Response('Ubicacion no existe', { status: 404 });
            }

            const newKid: kidModel = {
                _id: new ObjectId(),
                nombre: nino.nombre,
                comportamiento: nino.comportamiento,
                ubicacion: nino.ubicacion,
            };
            await kidCollection.insertOne(newKid);
            const response = {
                message: "Niño Creado con exito",
                niño: newKid,
            };
            return new Response(JSON.stringify(response), { status: 201, headers: { "Content-Type": "application/json" } });
        }

    } else if (method === 'GET') {
        if (path === '/ninos/buenos') {
            const goodKids = await kidCollection.find({ comportamiento: goodOrBad.good }).toArray();
            const response = {
                message: "Niños Buenos",
                niños: goodKids,
            };
            return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
        } else if (path === '/ninos/malos') {
            const badKids = await kidCollection.find({ comportamiento: goodOrBad.bad }).toArray();
            const response = {
                message: "Niños Malos",
                niños: badKids,
            };
            return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
        } else if (path === '/entregas') {
            const goodKidsByPlace = await getGoodKidsByPlace();
            const sortedPlaces = goodKidsByPlace.sort((a, b) => b.count - a.count);
            const response = {
                message: "Entregas",
                entregas: sortedPlaces,
            };
            return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
        } else if (path === '/ruta') {
            const goodKidsByPlace = await getGoodKidsByPlace();
            const sortedPlaces = goodKidsByPlace.sort((a, b) => b.count - a.count);

            let totalDistance = 0;
            for (let i = 0; i < sortedPlaces.length - 1; i++) {
                const place1 = sortedPlaces[i].place;
                const place2 = sortedPlaces[i + 1].place;
                totalDistance += haversine(place1.coordenadas[0], place1.coordenadas[1], place2.coordenadas[0], place2.coordenadas[1]);
            }
            const response = {
                message: "Distancia total a recorrer por Santa Claus",
                distancia: totalDistance,
            };
            return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
        }
    }

    return new Response('Endpoint Not Found', { status: 404 });
};

Deno.serve({ port: 6768 }, handler);
