package com.keystone.exception;
public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(String partName, int requested, int available) {
        super("Insufficient stock for part '" + partName + "'. Requested: " + requested + ", Available: " + available);
    }
}
