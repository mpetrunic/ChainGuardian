import * as React from "react";
import {useState, useEffect} from "react";
import { 
    BarChart, Bar, XAxis, Tooltip,
} from "recharts";

export interface IErrorGraphProps {
    getData: () => Promise<number[]>;
}

export const ErrorGraph: React.FunctionComponent<IErrorGraphProps> = (props: IErrorGraphProps) => {
    const [data, setData] = useState<Array<object>>([]);

    function normalize (dataArray: Array<object>, array: number[]): Array<object> {
        const dateToday = new Date();
        const hour = dateToday.getHours();
        for (let i = 12; i >=0; i--) {
            dataArray.push({
                name: ((hour-i)<1 ? 24+hour-i : hour-i) + "h",
                error: array[i]
            });
        }
        return dataArray;
    }

    const awaitData = async (): Promise<void>=>{
        props.getData().then((dataValueArray)=>{
            let dataArray: Array<object> = [];
            dataArray = normalize(dataArray,dataValueArray);
            setData(dataArray);
        });
    };

    useEffect(()=>{
        awaitData();
    },[])

    return(
        <div className="balance-graph" >
            <div className="graph-header" >
                <div className="graph-title">Error Frequency</div>
                <div className="graph-option position" >IN THE LAST DAY</div>
            </div>
            <BarChart
            width={624} height={199} data={data}
            margin={{top: 5, bottom: 0, left: 10, right: 10,}}>
                <XAxis dataKey="name" stroke="#9ba7af" 
                    interval="preserveStartEnd" tickLine={false}/>
                <Tooltip contentStyle={{color: "red"}} cursor={false} isAnimationActive={false}/>
                <Bar dataKey="error" fill="#C3CBCF" barSize={28}/>
            </BarChart>
        </div>
    );
}