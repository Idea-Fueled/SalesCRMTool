import React, { useState } from 'react';

const CollapsibleDealName = ({ name, onNavigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (!name) return <span className="text-gray-400">—</span>;

    const words = name.trim().split(/\s+/);
    
    // Default style from the table
    const nameClasses = "font-bold text-gray-800 transition-colors cursor-pointer hover:text-red-600";
    
    if (words.length <= 3) {
        return (
            <span className={nameClasses} onClick={onNavigate}>
                {name}
            </span>
        );
    }

    const firstThree = words.slice(0, 3).join(" ");
    const rest = words.slice(3).join(" ");

    const handleToggle = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="inline-block align-top max-w-full">
            {!isExpanded ? (
                <div className="flex items-center whitespace-nowrap">
                    <span className={nameClasses} onClick={onNavigate}>
                        {firstThree}
                    </span>
                    <span 
                        onClick={handleToggle}
                        className="ml-1 text-gray-400 hover:text-red-600 font-black cursor-pointer px-1 rounded hover:bg-gray-100 transition-all select-none"
                    >
                        ...
                    </span>
                </div>
            ) : (
                <div 
                    className="cursor-pointer group select-none flex flex-col items-start"
                    onClick={handleToggle}
                    title="Click to collapse"
                >
                    <div className="font-bold text-gray-800 whitespace-nowrap leading-none mb-0.5">
                        {firstThree}
                    </div>
                    <div className="font-bold text-gray-800 text-[14px] leading-tight whitespace-normal break-words max-w-[250px]">
                        {rest}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollapsibleDealName;








