import React from 'react'

export const GalaxyLogo: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 24, className = "", style }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
        >
            <path
                d="M12 2C10.1 2 8.3 2.7 6.9 4M12 22C13.9 22 15.7 21.3 17.1 20M2 12C2 13.9 2.7 15.7 4 17.1M22 12C22 10.1 21.3 8.3 20 6.9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M12 7C9.2 7 7 9.2 7 12C7 14.8 9.2 17 12 17C14.8 17 17 14.8 17 12C17 9.2 14.8 7 12 7Z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="1"
            />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <path
                d="M12 2C14.5 2 16.8 3.3 18.2 5.5M12 22C9.5 22 7.2 20.7 5.8 18.5M2 12C2 9.5 3.3 7.2 5.5 5.8M22 12C22 14.5 20.7 16.8 18.5 18.2"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="1 2"
            />
            <circle cx="18" cy="4" r="1" fill="currentColor" />
            <circle cx="4" cy="20" r="1" fill="currentColor" />
            <circle cx="21" cy="15" r="0.5" fill="currentColor" />
            <circle cx="3" cy="9" r="0.5" fill="currentColor" />
            <circle cx="10" cy="3" r="0.5" fill="currentColor" />
            <circle cx="14" cy="21" r="0.5" fill="currentColor" />
        </svg>
    )
}
