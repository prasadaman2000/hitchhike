//Welcome to the backend, this is Aman, your host, who has some tips about using this file.
//1. do not use the default route (app.get("/")), always make a specific route based on the action
//2. do not use

const express = require('express')
const app = express()
const port = 8000
const sgMail = require('@sendgrid/mail');
var db = require("./db.js");
sgMail.setApiKey("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");

app.listen(port, () => {
    console.log("Welcome to the HitchHike internal API!");
})

//parse incoming requests as JSON
app.use(express.json());

//base url of server
const baseURL = "http://ec2-13-59-36-193.us-east-2.compute.amazonaws.com:8000/";

//if you use this, make sure to comment why you used this
app.get("/", (req, res) => {
    res.send("Welcome!");
})

//example function to send email
var emailsSent = 0;
const ex = {
    to: 'kailas@ucsc.edu',
    from: 'test@gethitchhike.ml',
    subject: 'This is an example email'
};

app.get("/sendmeanemail", (reg, res) => {
    emailsSent++;
    ex.html = 'You have recieved <strong>' + emailsSent + '</strong> emails since the server was restarted!'
    sgMail.send(ex).then(() => {
        res.send('Email sent!');
    }).catch((error) => {
        console.log('error', error);
    });
})

const verificationEmail = {
    from: "welcome@gethitchhike.ml",
    template_id: "d-0e933e0acf104ea0998fb4e627225d02",
    dynamic_template_data: {}
}

/*
generate new code and send verification email
*/
function verifyUser(user) {
    var code = Math.random().toString(10).substring(2, 7);

    if (user != null) {
        user.userStatus.code = code;
        verificationEmail.to = user.email;
        verificationEmail.dynamic_template_data = {
            user: user.fName,
            url: baseURL + "verify/user/" + user.username + "?v=" + code
        }
        //console.log(verificationEmail);   
        sgMail.send(verificationEmail).catch((e) => {
            console.log('error', e);
        });
    }
}

/*
Endpoint for creating new user.
Parameters: (firstName, LastName, username, password, email, phoneNumbre, DOB)
*/
app.post("/signup", (req, res) => {
    var user = -1;
    try {
        var data = req.body;
        var user = db.newUser(data.fName, data.lName, data.username, data.password, data.email, data.pNumber, data.DOB);

        res.send({ success: true });
    } catch (e) {
        console.log(e);
        res.send({ success: false, reason: e });
    }

    if (user != -1) verifyUser(user);
});

/*
Endpoint for logging into the app and retriving user data.
Parameters: (username)
*/
app.post("/login", (req, res) => {
    try {
        var user = db.getUser(req.body.username);
        console.log(user.pNumber);
        console.log(user);
        if (user.password === (db.hash(req.body.password))) {
            if (user.userStatus.verified) {
                res.send({ success: true, data: user });
            } else {
                res.send({ success: false, reason: "Not verified" });
            }
        } else {
            res.send({ success: false, reason: "Invalid password" });
        }
    } catch (e) {
        res.send({ success: false, reason: e });
    }
});

/*
Endpoint for posting a ride to the database.
Parameters: (username, orgin:{x, y}, destination:{x, y}, seats, departure)
*/
app.post("/rides/postRide", (req, res) => {
    //console.log(req.body);
    try {
        var data = req.body
        var user = db.getUser(data.username)

        if (user.userStatus.verified === false) verifyUser(user);

        var Ride = db.postRide(data.username, data.origin, data.destination, data.seats, data.departure, data.price);
        console.log(user.pNumber);
        console.log(data.price);
        res.send({ success: true, data: Ride });
    } catch (e) {
        console.log(e);
        res.send({ success: false, reason: e });
    }
});

/*
Endpoint for updating a previously posted ride.
Parameters: (username, rideID, origin:{x, y}, destination:{x, y}, seats, departure)
*/
app.post("/rides/updateRide", (req, res) => {
    try {
        var data = req.body
        var user = db.getUser(data.username);
        var ride = data.ride

        var Ride = db.updateRide(ride);
        res.send({ success: true });
    } catch (e) {
        console.log(e);
        res.send({ success: false, reason: "Ride not updated!" });
    }
});

/*
Endpoint for finding k nearest rides to origin.
Parameters: (origin:{x, y}, departure)
*/
app.post("/rides/findRide", (req, res) => {
    try {
        var data = req.body;
        var rides = db.findRide(data.origin);

        res.send({ success: true, body: rides });
    } catch (e) {
        console.log(e);
        res.send({ success: false, "reason": e });
    }
});

/*
Endpoint for getting all rides.
Parameters: ()
*/
app.get("/rides/allRides", (req, res) => {
    try {
        var rides = db.allRides();
        res.send({ success: true, body: rides });
    } catch (e) {
        console.log(e);
        res.send({ success: false, "reason": e });
    }
});

/*
Endpoint to verify users email
*/
app.get("/verify/user/:username", (req, res) => {
    try {
        var user = db.getUser(req.params.username);
        if (user.userStatus.code != req.query.v) {
            throw "Invalid verification code";
        }
        user.userStatus.verified = true;
        res.sendFile('verify.html', { root: __dirname });
    } catch (e) {
        console.log(e);
        res.sendFile('fail.html', { root: __dirname });
    }
});

/*
Endpoint to request a ride.
Parameters: (username, )
*/
app.post("/rides/requestRide", (req, res) => {
    try {
        var user = db.getUser(req.body.username)

        user.requestedRides.push(req.body.ride);

        var oldRide = req.body.ride
        var newRide = JSON.parse(JSON.stringify(oldRide));
        newRide.Ride.seatsLeft--

        inserted = db.updateRide(oldRide, newRide);

        res.send({ success: true });
    }
    catch (e) {
        console.log(e);
        res.send({ success: false, reason: e });
    }
});

/*
*/
app.post("/review", (req, res) => {
    try {
        db.giveReview(req.body.reviewer, req.body.receiver, req.body.message, req.body.rating);
        res.send("Success!");
    }

    catch (e) {
        console.log(e);
        res.send(e);
    }
})


/*
*/
app.post("/getRating", (req, res) => {
    try {
        res.send(db.getRating(req.body.username));
    }
    catch (e) {
        console.log(e);
        res.send(e);
    }
})

app.get("/getUser/:userName", (req, res) => {
    try {
        res.send(db.getUser(req.params.userName));
    } catch (e) {
        console.log(e);
        res.send(e);
    }
})

/*
Endpoint for getting past rides.
Parameters: ()
This needs to be updated
*/

// app.get("/rides/pastRides", (req, res) => {
//     try {
//         var rides = db.allRides();
//         res.send({ success: true, body: rides });
//     } catch (e) {
//         console.log(e);
//         res.send({ success: false, "reason": e });
//     }
// });

