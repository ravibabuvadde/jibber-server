import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.send("Hello");
});

const availablePersons = [];
const matchedPersons = [];

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("join", (msg) => {
    if (availablePersons.length === 0) {
      availablePersons.push({ id: socket.id });
    } else {
      const person = availablePersons.pop(0);

      socket.to(person.id).emit("match", { id: socket.id });
      socket.emit("match", { id: person.id });
      matchedPersons.push({ id1: socket.id, id2: person.id });
    }
    console.log(socket.id + " joined");
    console.log(availablePersons);
    console.log(matchedPersons);
  });

  socket.on("message", (msg) => {
    io.to(msg.to).emit("message", msg);
    // console.log(msg);
  });

  socket.on("typing", (msg) => {
    io.to(msg.to).emit("typing", msg);
    // console.log(msg);
  });

  socket.on("skipChat", (msg) => {
    matchedPersons.forEach((person) => {
      if (person.id1 === socket.id) {
        // availablePersons.push({ id: person.id2 });

        socket.to(person.id2).emit("disconnected");
      } else if (person.id2 === socket.id) {
        // availablePersons.push({ id: person.id1 });
        socket.to(person.id1).emit("disconnected");
      }
    });

    // delete matchedPersons where id1 or id2 is socket.id
    matchedPersons.forEach((person, index) => {
      if (person.id1 === socket.id || person.id2 === socket.id) {
        matchedPersons.splice(index, 1);
      }
    });

    socket.emit("skipChat");
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    // console.log(availablePersons);

    availablePersons.forEach((person, index) => {
      if (person.id === socket.id) {
        availablePersons.splice(index, 1);
      }
    });

    matchedPersons.forEach((person) => {
      if (person.id1 === socket.id) {
        // availablePersons.push({ id: person.id2 });

        socket.to(person.id2).emit("disconnected");
      } else if (person.id2 === socket.id) {
        // availablePersons.push({ id: person.id1 });
        socket.to(person.id1).emit("disconnected");
      }
    });

    // delete matchedPersons where id1 or id2 is socket.id
    matchedPersons.forEach((person, index) => {
      if (person.id1 === socket.id || person.id2 === socket.id) {
        matchedPersons.splice(index, 1);
      }
    });
  });
});

server.listen(3001, () => {
  console.log("server running at http://localhost:3001");
});
