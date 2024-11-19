import type { Collection } from "mongodb";
import {placesModel, type place, kidModel, kid} from "./types.ts";




export const convertplacesModelToPlace = (placeModel : placesModel):place =>{

    return {
        id: placeModel._id.toString(),
        coordenadas:placeModel.coordenadas,
        name : placeModel.name,
        goodKids : placeModel.goodKids
    }
}

export const convertModelToKid = async (kidModel:kidModel,placeCollection: Collection<placesModel>):Promise<kid> =>{

    const placeModel = await placeCollection.findOne({_id:kidModel.ubicacion})
    if(!placeModel){
        throw new Error('No se encontro la ubicacion')
    }
    const place = await convertplacesModelToPlace(placeModel)

    return {
        id : kidModel._id.toString(),
        nombre : kidModel.nombre,
        ubicacion:place,
        comportamiento : kidModel.comportamiento
    }
}