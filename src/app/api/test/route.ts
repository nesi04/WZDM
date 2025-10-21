import { db } from "@/lib/db";
import { NextResponse } from "next/server";
export async function GET() {
    try{
        await db.$connect();
        const userCount = await db.user.count();
        const noteCount = await db.note.count();

        return NextResponse.json({
            status:'success',
            message:"Database is working and ofc connected",
            data:{
                users:userCount,
                notes:noteCount,
                timeStamp:new Date().toISOString()
            }
        })
    }
    catch(error){
        console.error("Database connection error ", error)
        return NextResponse.json({
            status:"error",
            message:"db coonection failed ",
            error : error instanceof Error? error.message: 'Unkown error'
        },
    {status:500})
    }
    
}   