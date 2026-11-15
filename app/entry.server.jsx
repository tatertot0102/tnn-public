import {PassThrough} from 'node:stream'
import {createReadableStreamFromReadable} from '@react-router/node'
import {ServerRouter} from 'react-router'
import {renderToPipeableStream} from 'react-dom/server'
import {isbot} from 'isbot'
export default function handleRequest(request,status,headers,context) {
  return new Promise((resolve,reject)=>{
    let sent=false;const ready=isbot(request.headers.get('user-agent')||'')?'onAllReady':'onShellReady'
    const stream=renderToPipeableStream(<ServerRouter context={context} url={request.url}/>,{
      [ready](){sent=true;const body=new PassThrough();headers.set('Content-Type','text/html; charset=utf-8');if(status>=400){headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow')};resolve(new Response(createReadableStreamFromReadable(body),{status,headers}));stream.pipe(body)},
      onShellError:reject,onError(error){status=500;if(sent)console.error('Rendering failed',error instanceof Error?error.name:'error')},
    });const timer=setTimeout(()=>stream.abort(),10000);timer.unref()
  })
}
