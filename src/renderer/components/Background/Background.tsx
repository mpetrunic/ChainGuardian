import * as React from "react";

interface IBackgroundProps {
    children?: any;
    basic?: boolean;
}

export const Background: React.FunctionComponent<React.PropsWithChildren<IBackgroundProps>> = ({
    children, 
    basic}) => ( basic ? 
    <div className="background">
        <div className="children">{children}</div>
    </div> 
    : 
    <div className="background">
        <div className="illustration" >
            <div className="children">{children}</div>
        </div>
    </div>
);