import {ObjectId} from "npm:mongodb"

export enum goodOrBad {
    good = "good",
    bad = "bad"
}

export type kidModel = {
    _id : ObjectId
    nombre : string
    comportamiento : goodOrBad
    ubicacion : ObjectId
}

export type placesModel = {
    _id : ObjectId
    name : string
    coordenadas : number []
}

export type kid ={
    id : string
    nombre : string
    comportamiento : goodOrBad
    ubicacion : place
}

export type place = {
    id : string
    name : string
    coordenadas : number[]
}