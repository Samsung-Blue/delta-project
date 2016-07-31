var express = require('express');
var app = express();
var mysql = require('mysql');
//var SessionSockets= require('session.socket.io');
var bcrypt = require('bcryptjs')
var bodyParser = require('body-parser');
var http = require('http');
var cookieParser=require('cookie-parser');
//var sessionstore = require('sessionstore');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var userConnected,noOfGroups,connected=1;
var users=[];
var allUsers=[];
var groups=[];
var usergroups =[];
var addUsers=[],notifgroups=[],notifnames=[];

//app.use(express.session({
//sessionStore= sessionstore.createSessionStore();
//}));

//var sessionSockets= new SessionSockets(io,sessionStore,cookieParser);

io.on('connection',function(socket){
	console.log("User connected");
	connection.query('SELECT * from groups WHERE username = ?',userConnected,function(err,rows){
		noOfGroups=rows.length;
		usergroups.splice(0,usergroups.length);
		for(i=0;i<rows.length;i++){
		    usergroups.push(rows[i].groupname);
		    for(j=0;j<notifgroups.length;j++){
		    	if(rows[i].groupname==notifgroups[j]&&notifnames[j]!=userConnected){
		    		socket.emit('notif',notifnames[j],notifgroups[j]);
		    	}
		    }
		}
		socket.emit('check',userConnected,noOfGroups,usergroups);
	});
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
	connection.query('SELECT * FROM groups',function(err,grouprows){
		for(j=0;j<grouprows.length;j++){
		if(userConnected==grouprows[j].username){
	    connection.query('SELECT * FROM posts WHERE groupname = ?',grouprows[j].groupname,function(err,rows){
		  if(rows.length>6){
			for(i=(rows.length-5);i<rows.length;i++){
			    socket.emit('previous',rows[i].username,rows[i].tweets,rows[i].groupname);
			}
		}
		else{
			for(i=0;i<rows.length;i++){
			socket.emit('previous',rows[i].username,rows[i].tweets,rows[i].groupname);
	    }
		}
	});
	}
    }
	});
	socket.on('chat message',function(username,message,group){
		messageString = {
			username : username,
			tweets : message,
			groupname : group
		};
		connection.query('INSERT INTO posts SET ?',messageString,function(err){
			if(!err)
			  console.log("Message posted");
			else 
				console.log(err);
		});
		io.emit('chat message',username,message,group);
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
connection.query('DROP TABLE groups',function(){});

connection.query('CREATE TABLE users(username varchar(100),password varchar(100),email varchar(100),nogroups int)',function(err){
	if(err)
		console.log("Error creating table");
	else
		console.log("Table created");
});

connection.query('CREATE TABLE posts(username varchar(100),tweets varchar(1000),groupname varchar(100))',function(err){
	if(!err)
		console.log("Table created");
});

connection.query('CREATE TABLE groups(username varchar(100),groupname varchar(100))',function(err){
	if(!err)
		console.log("Table created");
	else
		console.log(err);
});



app.get('/',function(req,res){
	displayIndex(req,res);
});

app.post('/',function(req,res){
	var post={
		username : req.body.user,
		password : req.body.password,
		email : req.body.email,
		nogroups : 0
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

app.get('/login',function(req,res){
	res.render('login',{member:""});
});

app.post('/login',function(req,res){
	connection.query('SELECT * FROM users where username=?',req.body.userlogin,function(err,rows,fields){
		if(rows.length>0&&bcrypt.compareSync(req.body.passlogin,rows[0].password)){
			sendMessages(req,res,req.body.userlogin,rows[0].nogroups);
		}
		else{
			res.render('index',{string:"",message:"Username or Password is incorrect"});
		}
	});
});

app.get('/addgroup',function(req,res){
	connection.query('SELECT * FROM users',function(err,rows){
		addUsers.splice(0,allUsers.length);
		for(i=0;i<rows.length;i++){
			addUsers.push(rows[i].username);
		}
	});
	res.render("addgroup",{users:allUsers,message:""});
});

app.post('/addgroup',function(req,res){
	var count=0;
	post={
		groupname: req.body.group,
		users : req.body.user
	};
	userrow={
	    username : userConnected,
	    groupname : req.body.group
	} 
	connection.query('SELECT * FROM users',function(err,rows){
		for(i=0;i<rows.length;i++){
			allUsers.push(rows[i].username);
		}
	});
	for(i=0;i<post.users.length;i++)
	{
		if(post.users[i]!='')
			{
		    for(j=0;j<allUsers.length;j++)
		    {
				if(post.users[i]==allUsers[j]){
				  row={
	                username : post.users[i],
	                groupname : req.body.group
	              } 
		          connection.query('INSERT INTO groups SET ?',row,function(err){
		          	 groups.push(req.body.group);
		             if(err)
			           console.log(err);
	              });
	              break;
		        }
		    }
		    if(j==allUsers.length){
		    	res.render('addgroup',{users:addUsers,message:"User not found"});
		    	count=1;
		    }
		    }
		}
	if(count!=1){
	   connection.query('INSERT INTO groups SET ?',userrow,function(err){
		    if(err)
			    console.log(err);
	        });
	   res.render('login',{member:""});
	}
});

app.get('/joingroup',function(req,res){
	res.render('joingroup',{message:""});
});

app.post('/joingroup',function(req,res){
	groupname= req.body.join;
	userjoin= userConnected;
	notifnames.push(userjoin);
	notifgroups.push(groupname);
	res.render('joingroup',{message:"Request has been sent"})
});

app.post('/addmember',function(req,res){
	var count;
	post={
		username: req.body.user,
		groupname: req.body.group
	}
	for(i=0;i<notifgroups.length;i++){
		if(post.username==notifgroups[i]&&post.groupname==notifnames[i]){
			notifgroups.splice(i,1);
			notifnames.splice(i,1);
		}
	}
	connection.query('SELECT * FROM groups WHERE username = ?',userConnected,function(err,rows){
		for(i=0;i<rows.length;i++){
			if(rows[i].groupname==post.groupname){
				connection.query('INSERT INTO groups SET ?',post,function(err){
		           if(err){
			         console.log(err);
			         res.render('login',{member:""});
		            }
			       	res.render('login',{member:"New Member added"});
			       	count=1;
			    });
			}
		}
	});
	if(count!=1){
		res.render('login',{member:"Could not add member"});
	}
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

app.get('/join',function(req,res){
	res.sendFile(__dirname+'/join.html');
});

function displayIndex(req,res)
{
	res.render('index',{string:"",message:""});
}

function sendMessages(req,res,username,number){
	userConnected=username;
	noOfGroups = number;
	res.render('login',{member:""});
}

server.listen(8081,function(){
	console.log("Listening at port 8081");
});

