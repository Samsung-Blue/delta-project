var express = require('express');
var app = express();
var mysql = require('mysql');
var SessionSockets= require('session.socket.io');
var bcrypt = require('bcryptjs')
var bodyParser = require('body-parser');
var http = require('http');
var cookieParser=require('cookie-parser');
var sessionstore = require('sessionstore');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var userConnected,connected=1;
var users=[];

//app.use(express.session({
//sessionStore= sessionstore.createSessionStore();
//}));

//var sessionSockets= new SessionSockets(io,sessionStore,cookieParser);

io.on('connection',function(socket){
	console.log("User connected");
	/*connection.query('CREATE TABLE groups(username varchar(100),name varchar(100))',function(err){
		if(!err)
			console.log("User")
	})*/
	var flag=-1;
	for(i=0;i<users.length;i++)
	{
		if(userConnected==users[i])
			flag=0;
	}
	if(flag==-1)
	   users.push(userConnected);
	socket.emit('online',userConnected);
	connected=1;
	io.emit('users',userConnected,users,connected);
	connection.query('SELECT * FROM posts',function(err,rows){
		if(rows.length>6){
			for(i=(rows.length-5);i<rows.length;i++){
			    socket.emit('previous',rows[i].username,rows[i].tweets);
			}
		}
		else{
			for(i=0;i<rows.length;i++){
			socket.emit('previous',rows[i].username,rows[i].tweets);
	    }
		}
	});
	socket.on('chat message',function(username,message){
		messageString = {
			username : username,
			tweets : message
		};
		connection.query('INSERT INTO posts SET ?',messageString,function(err){
			if(!err)
			  console.log("Message posted");
			else 
				console.log(err);
		});
		io.emit('chat message',username,message);
	});
	socket.on('disconnecting',function(username){
        for(i=0;i<users.length;i++)
        {
        	if(username==users[i])
        		var pos=i;
        }
        users.splice(pos,1);
        connected=0;
		io.emit('users',username,users,connected);
	});
	socket.on('disconnect',function(){
		console.log("User disconnected");
	});
});

var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
    password: 'infinity',
    port: 8801,
    database: 'facepalm'
});

app.use(express.static('public'));
app.use(bodyParser());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

connection.connect(function(err){
	if(err)
		console.log("Error connecting to database");
	else
		console.log("Connection to database sucessful")
});

connection.query('DROP TABLE users',function(){});
connection.query('DROP TABLE posts',function(){});

connection.query('CREATE TABLE users(username varchar(100),password varchar(100),email varchar(100))',function(err){
	if(err)
		console.log("Error creating table");
	else
		console.log("Table created");
});

connection.query('CREATE TABLE posts(username varchar(100),tweets varchar(1000))',function(err){
	if(!err)
		console.log("Table created");
});


app.get('/',function(req,res){
	displayIndex(req,res);
});

app.post('/',function(req,res){
	var post={
		username : req.body.user,
		password : req.body.password,
		email : req.body.email
	}
	var confirm = req.body.confirm;
	if(validate(post,confirm,res)){
		var salt = bcrypt.genSaltSync(1);
        var hash = bcrypt.hashSync(post.password,salt);
        post.password=hash;
	    connection.query('INSERT INTO users SET ?',post,function(err){
	    	if(err)
	    		console.log("Error in inserting row");
	    	else{
	    		console.log("Row inserted");
	    		res.render('index',{string:"Registered!! Login to Broadcast your thoughts",message:""});
	    	}
	    });
	}
});

app.post('/join',function(req,res){
	connection.query('SELECT * FROM users where username=?',req.body.userlogin,function(err,rows,fields){
		if(rows.length>0&&bcrypt.compareSync(req.body.passlogin,rows[0].password)){
			sendMessages(req,res,req.body.userlogin);
		}
		else{
			res.render('index',{string:"",message:"Username or Password is incorrect"});
		}
	});
});

function validate(post,confirm,res){
	if(post.username===""||post.password===""||post.email==="")
	{
		res.render('index',{string:"Fields should not be empty",message:""});
		return false;
	}
	connection.query('SELECT * FROM users',function(err,rows,fields){
		for(i=0;i<rows.length;i++){
			if(rows[i].username===post.username)
			{
				res.render('index',{string:"Username should be unique. Try entering another username",message:""});
				return false;
			}
		}
	});
    if(confirm!==post.password)
    {
    	res.render('index',{string:"Check the password",message:""});
    	return false;
    }
    return true;
}

function displayIndex(req,res)
{
	res.render('index',{string:"",message:""});
}

function sendMessages(req,res,username){
	userConnected=username;
	res.sendFile(__dirname+'/join.html');
}

server.listen(8081,function(){
	console.log("Listening at port 8081");
});

