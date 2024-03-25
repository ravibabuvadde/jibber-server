import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { v4 } from "uuid";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  // current full count of connected sockets
  res.send("Current Active Users " + io.engine.clientsCount);
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
    // console.log(socket.id + " joined");
    // console.log(availablePersons);
    // console.log(matchedPersons);
  });

  socket.on("message", (msg) => {
    const message = {
      id: v4(),
      sender_id: socket.id,
      message: msg.message,
      to: msg.to,
      datatype: msg.datatype,
      deleted: false,
    };
    io.to(msg.to).emit("message", message);
    socket.emit("message", message);
    // console.log(msg);
  });

  socket.on("typing", (msg) => {
    io.to(msg.to).emit("typing", msg);
    // console.log(msg);
  });

  socket.on("endChat", (msg) => {
    matchedPersons.forEach((person) => {
      if (person.id1 === socket.id) {
        // availablePersons.push({ id: person.id2 });

        socket.to(person.id2).emit("endChat");
      } else if (person.id2 === socket.id) {
        // availablePersons.push({ id: person.id1 });
        socket.to(person.id1).emit("endChat");
      }
    });

    // delete matchedPersons where id1 or id2 is socket.id
    matchedPersons.forEach((person, index) => {
      if (person.id1 === socket.id || person.id2 === socket.id) {
        matchedPersons.splice(index, 1);
      }
    });

    socket.emit("endChat");
  });

  socket.on("deleteMessage", (msg) => {
    io.to(msg.to).emit("deleteMessage", msg);
    socket.emit("deleteMessage", msg);
  });

  socket.on("disconnect", () => {
    // console.log("user disconnected");
    // console.log(availablePersons);

    availablePersons.forEach((person, index) => {
      if (person.id === socket.id) {
        availablePersons.splice(index, 1);
      }
    });

    matchedPersons.forEach((person) => {});

    // delete matchedPersons where id1 or id2 is socket.id
    matchedPersons.forEach((person, index) => {
      if (person.id1 === socket.id) {
        // availablePersons.push({ id: person.id2 });
        matchedPersons.splice(index, 1);

        socket.to(person.id2).emit("endChat");
      } else if (person.id2 === socket.id) {
        // availablePersons.push({ id: person.id1 });
        socket.to(person.id1).emit("endChat");
        matchedPersons.splice(index, 1);
      }
    });
  });
});

server.listen(3001, () => {
  console.log("server running at http://localhost:3001");
});
