
let total=10;
let index=0;
let ok=0;

const home=document.getElementById("home");
const game=document.getElementById("game");
const results=document.getElementById("results");
const question=document.getElementById("question");
const answer=document.getElementById("answer");
const score=document.getElementById("score");

function show(screen){
home.hidden=true;
game.hidden=true;
results.hidden=true;
screen.hidden=false;
}

function next(){
if(index>=total){
finish();
return;
}
const a=Math.floor(Math.random()*10);
const b=Math.floor(Math.random()*10);
game.dataset.a=a;
game.dataset.b=b;
question.textContent=`${a} + ${b} = ?`;
answer.value="";
answer.focus();
}

function finish(){
show(results);
score.textContent=`${ok} / ${total}`;
}

document.getElementById("start").onclick=()=>{
index=0; ok=0;
show(game);
next();
};

document.getElementById("validate").onclick=()=>{
const a=parseInt(game.dataset.a);
const b=parseInt(game.dataset.b);
if(parseInt(answer.value)===a+b) ok++;
index++;
next();
};

document.getElementById("replay").onclick=()=>{
index=0; ok=0;
show(game);
next();
};

document.getElementById("back").onclick=()=>show(home);
