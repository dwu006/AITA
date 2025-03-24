package db

import (
    "context"
    "fmt"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client
var database *mongo.Database

func Connect(uri string) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    clientOptions := options.Client().ApplyURI(uri)
    client, err := mongo.Connect(ctx, clientOptions)
    if err != nil {
        log.Fatalf("Failed to connect to MongoDB: %v", err)
    }

    // Ping the database to verify connection
    if err := client.Ping(ctx, nil); err != nil {
        log.Fatalf("MongoDB ping failed: %v", err)
    }

    fmt.Println("Connected to MongoDB!")
    Client = client
    database = client.Database("aita") // Use the "aita" database
}

// GetDB returns the database instance
func GetDB() *mongo.Database {
    if database == nil {
        log.Fatal("Database connection not initialized. Call Connect() first.")
    }
    return database
}
