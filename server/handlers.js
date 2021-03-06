"use strict";
const { MongoClient } = require("mongodb");
require("dotenv").config();
const { MONGO_URI } = process.env;
const assert = require("assert");

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const getSeats = async (req, res) => {
  const client = await MongoClient(MONGO_URI, options);
  try {
    await client.connect();
    const db = client.db("booking_system");
    const result = await db.collection("seats").find().toArray();
    // console.log(result);
    let seats = {};
    result.forEach((seat) => {
      //   console.log(seat);
      seats[seat._id] = seat;
    });
    // console.log(seats);
    res.status(200).json({
      seats: seats,
      bookedSeats: result,
      numOfRows: 8,
      seatsPerRow: 12,
    });
  } catch (err) {
    console.log(err.stack);
    res.status(500).json({ status: 500, message: err.message });
  }
  client.close();
};

let lastBookingAttemptSucceeded = false;

const bookSeats = async (req, res) => {
  const client = await MongoClient(MONGO_URI, options);
  const { seatId, creditCard, expiration, fullName, email } = req.body;

  await client.connect();
  const db = client.db("booking_system");
  try {
    const selectedSeat = await db.collection("seats").findOne({ _id: seatId });

    if (selectedSeat.isBooked) {
      return res.status(400).json({
        message: "This seat has already been booked!",
      });
    }

    if (!creditCard || !expiration) {
      return res.status(400).json({
        status: 400,
        message: "Please provide credit card information!",
      });
    }

    if (lastBookingAttemptSucceeded) {
      lastBookingAttemptSucceeded = !lastBookingAttemptSucceeded;

      return res.status(500).json({
        message:
          "An unknown error has occurred. Please try your request again.",
      });
    }

    lastBookingAttemptSucceeded = !lastBookingAttemptSucceeded;
    const newSeatValues = {
      $set: { isBooked: true },
    };
    const newReservationValues = {
      _id: seatId,
      userName: fullName,
      userEmail: email,
      userCard: creditCard,
      cardExpiration: expiration,
      seatbooking: seatId,
    };
    const updateSelectedSeat = await db
      .collection("seats")
      .updateOne({ _id: seatId }, newSeatValues);
    assert.strictEqual(1, updateSelectedSeat.matchedCount);
    assert.strictEqual(1, updateSelectedSeat.modifiedCount);

    await db.collection("reservations").insertOne(newReservationValues);

    return res.status(201).json({
      status: 201,
      success: true,
    });
  } catch (err) {
    console.log(err.stack);
    res.status(500).json({ status: 500, data: _id, message: err.message });
  }

  client.close();
};

const deleteBooking = async (req, res) => {
  const client = await MongoClient(MONGO_URI, options);
  const id = req.params._id;
  console.log(id);
  try {
    await client.connect();

    const db = client.db("booking_system");
    const newValues = {
      $set: { isBooked: false },
    };
    await db.collection("seats").updateOne({ _id: id }, newValues);
    await db.collection("reservations").deleteOne({ _id: id });
    res.status(204).json({ status: 204, message: "data deleted" });
  } catch (err) {
    console.log(err.stack);
    res.status(500).json({ status: 500, data: _id, message: err.message });
  }
  client.close();
};

const updateBooking = async (req, res) => {
  const client = await MongoClient(MONGO_URI, options);
  const id = req.params._id;
  console.log(req.body);
  const newName = req.body.fullName;
  const newEmail = req.body.email;
  console.log(id);
  try {
    await client.connect();

    const db = client.db("booking_system");
    if (newName === "" || newEmail === "") {
      res.status(400).json({
        status: 400,
        message: "Please provide with appropriate name and email.",
      });
    } else {
      const newValues = {
        $set: { userName: newName, userEmail: newEmail },
      };
      const updatereservation = await db
        .collection("reservations")
        .updateOne({ _id: id }, newValues);

      assert.strictEqual(1, updatereservation.matchedCount);
      assert.strictEqual(1, updatereservation.modifiedCount);

      res.status(200).json({
        status: 200,
        data: updatereservation,
        message: "Reservation updated with provided information",
      });
    }
  } catch (err) {
    console.log(err.stack);
    res.status(500).json({ status: 500, data: _id, message: err.message });
  }
  client.close();
};

module.exports = { getSeats, bookSeats, deleteBooking, updateBooking };
