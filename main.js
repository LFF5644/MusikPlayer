#!/usr/bin/env node
const {
	readFileSync,
	writeFileSync,
	readdirSync,
	mkdirSync,
}=require("fs");
const fetch=require("node-fetch");

const audioPlayerLib=require("audio-player-lib");    // https://github.com/LFF5644/audioPlayerLib
const socketTCP_client=require("socket-tcp/client"); // https://github.com/LFF5644/socketTCP

const config="config.json";
const folderDownloads="downloads";

const player=audioPlayerLib.createPlayer();

process.stdin.setRawMode(false);
process.stdin.on("data",buffer=>{
	const text=buffer.toString("utf-8").trim();
	if(text==="skip") player.nextTrack();
	else if(text==="pause") player.pause();
	else if(text==="play") player.play();
	else if(text==="exit") process.exit();
	else if(text==="") console.log("\n");
	else console.log("Befehl nicht gefunden!");
});