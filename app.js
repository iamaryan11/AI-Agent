import {GoogleGenAI,Type} from '@google/genai';
import {type} from 'os';
import axios from 'axios';
import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
dotenv.config();
const ai=new GoogleGenAI({apiKey:process.env.MY_API});

async function cryptoTool({coin}) {
    // lets use axios and not fetch:
    const response=await axios.get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}`);
    // console.log(response.data)
    const res=response.data
    return res;
}

// cryptoTool({coin:"bitcoin"})

async function getWeatherInfo({city}){
   try{
    const response=await axios.get(`http://api.weatherapi.com/v1/current.json?key=51c9e62a15c0423a833153739253012&q=${city}&aqi=yes`);
    
    const res=response.data
    return res
   }catch(error){
    console.log(`Error occured while fetching weather details ${error}`)
   }
}
// getWeatherInfo({city:"Bareilly"})



const infoAbtCrypto={
                name:"cryptoTool",
                description:"Can provide you the details about a particulara crypto like bitcoin, the price of bitcoin, its market cap, symbol etc",
                parameters:{
                    type:Type.OBJECT,
                    properties:{
                        coin:{
                            type:Type.STRING,
                        }
                    },
                    required:["coin"],
                }
            }

const infoAbtWeather={
                name:"getWeatherInfo",
                description:"Can provide us with the current weather AQI etc, for example temperature of london etc",
                parameters:{
                    type:Type.OBJECT,
                    properties:{
                        city:{
                            type:Type.STRING,
                        }
                    },
                    required:["city"],
                }
            }

            // we need to wrap this inside the array (this was also the part of initial errors)
const tools=[{
    
        functionDeclarations:[
           
              infoAbtCrypto,infoAbtWeather            

        ]
}
]

const toolFunctions=
    {
       "cryptoTool":cryptoTool,
       "getWeatherInfo":getWeatherInfo 
    }

const History=[]
async function runOurAgent(){
    console.log('runOurAgent function called')
    while(true){
        const result=await ai.models.generateContent({
            model:"gemini-2.5-flash",
            contents:History,
            // config:[tools],
            config:{tools},
        })
          console.log('All good till here')

        if(result.functionCalls&&result.functionCalls.length>0){
            console.log(' external tools are being called ')
            const functionCall=result.functionCalls[0];
            const {name,args}=functionCall;
            const response=await toolFunctions[name](args);

            const functionResponsePart={
                name:functionCall.name,
                response:{
                    result:response,
                }
            }

            // we will the response of our tools back to the model ;)
            // History.push({
            //     role:'model',
            //     parts:[{functionCall: functionCall}]
            // })

            History.push({
                role: 'model',
                parts: [{ functionCall: functionCall }]
            });

              History.push({
                role:'user',
                parts:[{functionResponse:functionResponsePart}]
            })

            // History.push({
            //     role: 'function', 
            //     parts: [{
            //         functionResponse: {
            //             name: name,
            //             response: { content: funcResponse }
            //         }
            //     }]
            // });
        
        }

        else{

            History.push({
                role:'model',
                parts:[{text:result.text}]
            })
            console.log(result.text)
            // write break this was causing the second time run issuse
            break;
        }
    }
}

while(true){
    const userQuestion=readlineSync.question("Ask me anything ;) ");
    if(userQuestion=='exit'){
        break;
    }
    History.push({
        role:'user',
        parts:[{text:userQuestion}]
    })
    await runOurAgent();
}