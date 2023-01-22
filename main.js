const {
	readFileSync,
	writeFileSync,
	readdirSync,
}=require("fs");
const fetch=require("node-fetch");
const {
	exec,
}=require("child_process");

const config_tracks="tracks.json";
const config_playback="playback.json";
const folderDownloads="downloads";

const tracks=JSON.parse(readFileSync(config_tracks,"utf-8"));
const playback=JSON.parse(readFileSync(config_playback,"utf-8"));
const tracksToPlay=[...tracks.files];	// Creates a new Object

function download(){return new Promise(async resolve=>{
	const downloadFileNames=readdirSync(folderDownloads)
		.map(item=>[item,Buffer.from(item,"hex").toString("utf-8")])
		.filter(item=>item[1]!="");

	const fileUrls=tracks.urls
		.map(item=>[item.split("/")[item.split("/").length-1],item]);
	
	const downloadRequired=fileUrls
		.filter(item=>!downloadFileNames.some(i=>i[1]==item[0]));

	let data;
	for(data of fileUrls){
		const [fileName_utf8,url]=data;
		const downloaded=downloadFileNames.find(item=>item[1]==fileName_utf8);
		if(!downloaded){continue;}
		tracksToPlay.push(folderDownloads+"/"+downloaded[0]);
	}

	if(downloadRequired.length==0){
		resolve();
		return;
	}else{
		const length=downloadRequired.length;
		console.log(`Es ${length==1?"muss":"müssen"} noch ${length} ${length==1?"Song":"Songs"} herunter geladen werden ...\n`);
	}
	data="";
	for(data of downloadRequired){
		const [fileName_utf8,url]=data;
		console.log(`${fileName_utf8} wird heruntergeladen...`);
		try{
			const header=await fetch(url);
			const arrayBuffer=await header.arrayBuffer();

			const fileData=Buffer.from(arrayBuffer);
			const fileName_hex=Buffer.from(fileName_utf8).toString("hex");
			const filePath=folderDownloads+"/"+fileName_hex;

			writeFileSync(filePath,fileData);
			tracksToPlay.push(filePath);
		}
		catch(e){
			console.log(`${fileName_utf8} konnte nicht heruntergeladen werden prüfen sie ihre verbindung!`);
			continue;
		}
		console.log(`${fileName_utf8} wurde erfolgreich heruntergeladen und zur wiedergabe hinzugefügt!`);
	}
	console.log("Herunterladen wurde abgeschlossen!");
	resolve();
	return;
})}

function cmd(cmd,data){return new Promise(async resolve=>{
	exec(cmd,(error,log)=>{resolve([error,log])});
})}

function playTrack(data){return new Promise(async resolve=>{
	const {file}=data;

	if(process.platform.startsWith("win")){	// win32; win64
		writeFileSync("_player.vbs",`\
			Set Sound=CreateObject("WMPlayer.OCX.7")
			Sound.URL="${file}"
			Sound.Controls.play
			do while Sound.currentmedia.duration=0
			wscript.sleep 100
			loop
			wscript.sleep(int(Sound.currentmedia.duration)+1)*1000\
		`.split("\t").join(""));
		await cmd("start \"\" /wait _player.vbs");
		writeFileSync("_player.vbs","");
		resolve();
		return;
	}
	else{
		await cmd(`mplayer "${file}"`);
		resolve();
		return;
	}
})}

(async ()=>{
	download();
	let track;
	for(track of tracksToPlay){
		await playTrack({file:track});
	}
})();
