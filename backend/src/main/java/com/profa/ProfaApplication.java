package com.profa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ProfaApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProfaApplication.class, args);
    }
}
