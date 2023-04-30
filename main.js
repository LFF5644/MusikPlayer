#!/usr/bin/env node
const fs=require("fs");
const audioPlayerLib=require("audio-player-lib");    // https://github.com/LFF5644/audioPlayerLib
const socketTCP_client=require("socket-tcp/client"); // https://github.com/LFF5644/socketTCP

const config_path="config.json";
const cache_path="cache";
const cacheIndex_path=cache_path+"/index.json";
const platform=process.platform==="win32"?"windows":process.platform;

function tryCreateDir(path){
	try{fs.mkdirSync(path)}
	catch(e){return false}
	return true;
}
function existCache(path){
	return Boolean(cacheIndex.find(item=>
		item.path===path	
	));
}
function createCache(entry){
	if(existCache(entry.path)) throw new Error("file '"+entry.path+"' already exists in cache!");
	const id=entry.id?entry.id:Date.now();
	const pathHex=Buffer.from(entry.path,"utf-8").toString("hex");
	const fileType=entry.path
		.split("/")
		.pop()
		.split(".")
		.pop();
	const fileTypeHex=Buffer.from(fileType,"utf-8").toString("hex");
	const cachePath=cache_path+"/"+fileTypeHex;
	const cacheFile=cachePath+"/"+pathHex.substring(0,5)+"_"+id+"_"+cacheIndex.length+1;
	tryCreateDir(cachePath);
	const cacheEntry={
		cacheFile,
		id,
		path: entry.path,
	};
	cacheIndex.push(cacheEntry);
	if(entry.buffer){
		fs.writeFileSync(cacheFile,entry.buffer);
	}
	fs.writeFileSync(cacheIndex_path,JSON.stringify(cacheIndex,null,4));
	return cacheEntry;
}
function getCacheEntry(path){
	if(!existCache(path)) throw new Error("cache don't exist!");
	const entry=cacheIndex.find(item=>
		item.path===path
	);
	return{
		...entry,
		read:()=> fs.readFileSync(entry.cacheEntry),
	};
}
function getFileName(path){
	return path
		.split("/")
		.pop()
		.split(".")[0]
}

let config;
readConf:{
	try{
		config=JSON.parse(fs.readFileSync(config_path,"utf-8"));
	}catch(e){
		console.log("cant found config!\ncreate template config!");
		fs.writeFileSync(
			config_path,
			JSON.stringify({
				socketTCP:{
					//use: true,
					host: "127.0.0.1",
					port: 59398,
				},
				localFiles:[],
				localMusicDirs:[
					platform==="windows"?process.env.USERPROFILE+"\\Music":"/home/"+process.env.USER+"/Music/",
				],
				remoteMusicDirs:[
					platform==="windows"?process.env.USERPROFILE+"\\Music":"/home/"+process.env.USER+"/Music/",
				],
				allowedFileTypes:[
					"mp3", "wav", // ...
				],
			},null,2)
				.split("  ")
				.join("\t")
		);
		process.exit(1);
	}
}

let cacheIndex;
readCacheIndex:{
	try{
		cacheIndex=JSON.parse(fs.readFileSync(cacheIndex_path,"utf-8"));
	}catch(e){
		tryCreateDir(cache_path);
		fs.writeFileSync(cacheIndex_path,"[]");
		cacheIndex=[];
	}
}

const player=audioPlayerLib.createPlayer();

let tcp;
getRemoteDirs:{
	tcp=socketTCP_client.createClient(
		config.socketTCP.host,
		config.socketTCP.port
	);
	
	if(!config.remoteMusicDirs) break getRemoteDirs;
	console.log("load songs from remote ...");
	
	const promises=[];
	let playerStarted=false;
	let downloadCounter=0;
	let downloadSuccessCounter=0;

	for(const dir of config.remoteMusicDirs){
		console.log(dir);
		const promise=tcp.listFiles(
			dir,
			config.allowedFileTypes
		);
		promises.push(promise);
		promise.then(async files=>{
			console.log(`${files.length} files found in "${dir}"`);
			const inCacheCounter=files.filter(item=>existCache(item)).length;
			const downloadRequiredCounter=files.length-inCacheCounter;
			downloadCounter+=downloadRequiredCounter;

			console.log(`${downloadRequiredCounter}/${files.length} files must download!`);
			console.log(`${inCacheCounter}/${files.length} files cached\n`);

			for(const file of files){
				if(existCache(file)){
					const entry=getCacheEntry(file);

					player.addTrack({
						src: entry.cacheFile,
						name: getFileName(entry.path),
					});
				}
				else{
					const data=await tcp.getFile(file);
					downloadSuccessCounter+=1;
					const entry=createCache({
						path: data.path,
						buffer: data.buffer,
					});
					player.addTrack({
						src: entry.cacheFile,
						name: getFileName(entry.path),
					});
				}
				if(!playerStarted){
					playerStarted=true;
					player.play();
				}
			}
		});
	}

	const fn=()=>{
		if(downloadCounter===0) return;
		process.stdout.write(`\r${downloadSuccessCounter}/${downloadCounter} Wurden Heruntergeladen ...`);
		if(downloadCounter!==downloadSuccessCounter) setTimeout(fn,500);
		else console.log("\nDownloading Finished!\n");
	};
	Promise.all(promises).then(fn);
}

process.stdin.on("data",data=>{
	const command=data.toString("utf-8").trim();
	if(command==="stop") player.stop();
	else if(command==="pause") player.pause();
	else if(command==="skip") player.nextTrack();
	else if(command==="play") player.play();
	else if(command==="exit") process.exit(0);
	else if(command==="list cache length") console.log(cacheIndex.length);
	else if(command==="list cache") console.log(cacheIndex);
	else console.log("command not found!");
});