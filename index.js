require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dns = require("dns");
const bodyParser = require("body-parser");
const { error } = require("console");
const { copyFileSync } = require("fs");
const { rejects } = require("assert");
const app = express();

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require("node-localstorage").LocalStorage;
    localStorage = new LocalStorage("./scratch");
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
    res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
    res.json({ greeting: "hello API" });
});

var id = 1;
var errorMessage = null;
localStorage.setItem("urls", JSON.stringify([]));
var urlsStorage = JSON.parse(localStorage.getItem("urls"));

app.route("/api/shorturl/:id?")
    .post(
        (req, res, next) => {
            const url = new URL(req.body.url);
            console.log(url);
            let checkDns = new Promise((resolve, rejects) => {
                dns.lookup(url.hostname, (err, address) => {
                    if (err) rejects(err);
                    else resolve(address);
                });
            });
            checkDns
                .then((res) => {
                    req.originalUrl = url.href;
                    if (
                        !urlsStorage.find(
                            (url) => url.original_url === req.body.url
                        )
                    ) {
                        urlsStorage.push({
                            original_url: url.href,
                            short_url: id,
                        });
                        id++;
                    }
                    localStorage.setItem("urls", JSON.stringify(urlsStorage));
                    next();
                })
                .catch((err) => {
                    errorMessage = err;
                    req.error = errorMessage;
                    next();
                });
        },
        (req, res) => {
            if (req.error) res.json({ error: "invalid url" });
            else {
                const url = urlsStorage.find(
                    (url) => url.original_url === req.originalUrl
                );
                res.json(url);
            }
        }
    )
    .get(
        (req, res, next) => {
            req.id = req.params.id;
            next();
        },
        (req, res) => {
            const newUrl = urlsStorage.find((url) => url.short_url == req.id);
            if (newUrl) res.redirect(newUrl.original_url);
        }
    );

app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});
