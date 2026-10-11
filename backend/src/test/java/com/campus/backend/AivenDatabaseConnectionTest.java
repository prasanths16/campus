package com.campus.backend;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class AivenDatabaseConnectionTest {

    @Test
    void testAivenCloudMySQLConnectivity() {
        CampusBackendApplication.initEnvironment();

        String host = getPropertyOrEnv("DB_HOST", "campus-mysql-campus-project.h.aivencloud.com");
        String port = getPropertyOrEnv("DB_PORT", "28405");
        String dbName = getPropertyOrEnv("DB_NAME", "defaultdb");
        String username = getPropertyOrEnv("DB_USERNAME", "avnadmin");
        String password = getPropertyOrEnv("DB_PASSWORD", null);
        String truststoreUrl = System.getProperty("DB_TRUSTSTORE_URL");
        String truststorePassword = getPropertyOrEnv("DB_TRUSTSTORE_PASSWORD", "changeit");

        System.out.println("=================================================");
        System.out.println("AIVEN MYSQL CONNECTIVITY & SSL VERIFICATION TEST");
        System.out.println("=================================================");
        System.out.println("Host: " + host);
        System.out.println("Port: " + port);
        System.out.println("Database: " + dbName);
        System.out.println("Username: " + username);
        System.out.println("SSL Mode: VERIFY_CA");
        System.out.println("Truststore URL: " + truststoreUrl);

        String envPass = System.getenv("DB_PASSWORD");
        String propPass = System.getProperty("DB_PASSWORD");
        System.out.println("Source Check:");
        System.out.println(" - System.getenv(\"DB_PASSWORD\") set: " + (envPass != null) + (envPass != null ? " (len=" + envPass.length() + ")" : ""));
        System.out.println(" - System.getProperty(\"DB_PASSWORD\") set: " + (propPass != null) + (propPass != null ? " (len=" + propPass.length() + ")" : ""));
        System.out.println(" - Effective password len: " + (password != null ? password.length() : 0));
        System.out.println(" - Is placeholder text from .env.example: " + ("your_aiven_database_password_here".equals(password)));
        System.out.println(" - Contains quotes: " + (password != null && (password.contains("\"") || password.contains("'"))));
        System.out.println(" - Contains whitespace: " + (password != null && (password.contains(" ") || password.contains("\t") || password.contains("\r") || password.contains("\n"))));

        if (password == null || password.trim().isEmpty()) {
            System.err.println("[ERROR] DB_PASSWORD is not set in the test environment.");
            System.err.println("Please set the DB_PASSWORD environment variable or configure backend/.env");
            return;
        }

        String jdbcUrl = String.format(
            "jdbc:mysql://%s:%s/%s?sslMode=VERIFY_CA&trustCertificateKeyStoreType=PKCS12&trustCertificateKeyStoreUrl=%s&trustCertificateKeyStorePassword=%s",
            host, port, dbName, truststoreUrl, truststorePassword
        );

        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             Statement stmt = conn.createStatement()) {

            assertNotNull(conn, "Connection should not be null");
            System.out.println("[SUCCESS] Successfully connected to Aiven Cloud MySQL!");

            // 1. Verify SSL Cipher & Version
            try (ResultSet rs = stmt.executeQuery("SHOW STATUS LIKE 'Ssl_cipher'")) {
                if (rs.next()) {
                    String cipher = rs.getString(2);
                    System.out.println("[SSL STATUS] Active Cipher: " + cipher);
                    assertTrue(cipher != null && !cipher.isEmpty(), "SSL Cipher must be active");
                }
            }

            try (ResultSet rs = stmt.executeQuery("SHOW STATUS LIKE 'Ssl_version'")) {
                if (rs.next()) {
                    System.out.println("[SSL STATUS] TLS Version: " + rs.getString(2));
                }
            }

            // 2. Query basic test
            try (ResultSet rs = stmt.executeQuery("SELECT 1")) {
                if (rs.next()) {
                    System.out.println("[QUERY CHECK] SELECT 1 returned: " + rs.getInt(1));
                }
            }

            // 3. Inspect existing tables without modifying anything
            List<String> tables = new ArrayList<>();
            try (ResultSet rs = stmt.executeQuery("SHOW TABLES")) {
                while (rs.next()) {
                    tables.add(rs.getString(1));
                }
            }
            System.out.println("[EXISTING TABLES IN " + dbName + "]: " + tables);

            System.out.println("=================================================");
            System.out.println("[RESULT] Aiven MySQL connection and SSL certificate validation verified successfully!");
            System.out.println("=================================================");

        } catch (Exception e) {
            System.err.println("[FAILURE] Could not connect to Aiven Cloud MySQL: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Aiven MySQL connection test failed", e);
        }
    }

    private String getPropertyOrEnv(String key, String defaultValue) {
        String val = System.getProperty(key);
        if (val == null || val.trim().isEmpty()) {
            val = System.getenv(key);
        }
        if (val == null || val.trim().isEmpty()) {
            return defaultValue;
        }
        return val.trim();
    }
}
