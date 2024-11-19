import {ObjectId} from "npm:mongodb"

enum goodOrBad {
    good,
    Bad
}

export type kidModel = {
    _id : ObjectId
    nombre : string
    comportamiento : goodOrBad
    ubicacion : ObjectId
}

export type placesModel = {
    _id : ObjectId
    nombre : string
    coordenadas : number []
    numNiñosBuenos : number
}

export type kid ={
    id : string
    nombre : string
    comportamiento : goodOrBad
    ubicacion : place
}

export type place = {
    id : string
    nombre : string
    coordenadas : number[]
    numNiñosBuenos : number
}