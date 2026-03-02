import React from "react";
import logo from "../assets/Logo.png";

const Logo = ({ className = "flex items-center justify-center mb-4" }) => {
    return (
        <div className={className}>
            <img src={logo} alt="brand-logo" className="h-10 w-auto" />
        </div>
    );
}

export default Logo;