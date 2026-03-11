import React from "react";
import { useNavigate } from "react-router-dom";

export default function SelectUser() {
    const navigate = useNavigate();

    return (
        <div style={{display:"flex",flexDirection:"column",gap:"20px",alignItems:"center",marginTop:"100px"}}>
            <h2>انتخاب کاربر</h2>

            <button onClick={() => navigate("/mohamad")}>
                Mohamad
            </button>

            <button onClick={() => navigate("/anita")}>
                Anita
            </button>

            <button onClick={() => navigate("/paniz")}>
                Paniz
            </button>
        </div>
    );
}
