package com.keystone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class KeystoneApplication {
    public static void main(String[] args) {
        SpringApplication.run(KeystoneApplication.class, args);
    }
}
