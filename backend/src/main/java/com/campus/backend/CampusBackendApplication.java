package com.campus.backend;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CampusBackendApplication {

    public static void main(String[] args) {
        initEnvironment();
        SpringApplication.run(CampusBackendApplication.class, args);
    }

    public static void initEnvironment() {
        loadDotenv();
        configureTruststore();
    }

    private static void loadDotenv() {
        // Look for .env in current directory, backend/, or parent directory
        File[] envCandidates = new File[] {
            new File(".env"),
            new File("backend/.env"),
            new File("../.env")
        };
        for (File file : envCandidates) {
            if (file.exists() && file.isFile()) {
                try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int eq = line.indexOf('=');
                        if (eq > 0) {
                            String key = line.substring(0, eq).trim();
                            String val = line.substring(eq + 1).trim();
                            if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
                                val = val.substring(1, val.length() - 1);
                            } else if (val.startsWith("'") && val.endsWith("'") && val.length() >= 2) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                            }
                        }
                    }
                } catch (Exception ignored) {
                }
                break;
            }
        }
    }

    private static void configureTruststore() {
        if (System.getProperty("DB_TRUSTSTORE_URL") != null || System.getenv("DB_TRUSTSTORE_URL") != null) {
            return;
        }

        try {
            // Check local file locations first
            File[] fileCandidates = new File[] {
                new File("src/main/resources/aiven-truststore.p12"),
                new File("backend/src/main/resources/aiven-truststore.p12"),
                new File("target/classes/aiven-truststore.p12"),
                new File("backend/target/classes/aiven-truststore.p12")
            };
            for (File candidate : fileCandidates) {
                if (candidate.exists() && candidate.isFile()) {
                    System.setProperty("DB_TRUSTSTORE_URL", candidate.toURI().toURL().toExternalForm());
                    return;
                }
            }

            // Fallback: extract from classpath resource to a secure temp file
            try (InputStream is = CampusBackendApplication.class.getClassLoader().getResourceAsStream("aiven-truststore.p12")) {
                if (is != null) {
                    File tempStore = File.createTempFile("aiven-truststore-", ".p12");
                    tempStore.deleteOnExit();
                    Files.copy(is, tempStore.toPath(), StandardCopyOption.REPLACE_EXISTING);
                    System.setProperty("DB_TRUSTSTORE_URL", tempStore.toURI().toURL().toExternalForm());
                }
            }
        } catch (Exception ignored) {
        }
    }
}
