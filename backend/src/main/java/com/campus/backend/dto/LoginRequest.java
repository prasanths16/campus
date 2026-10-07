package com.campus.backend.dto;

public class LoginRequest {

    private String collegeEmail;
    private String registerNumber;
    private String password;

    public LoginRequest() {
    }

    public LoginRequest(String collegeEmail, String password) {
        this.collegeEmail = collegeEmail;
        this.password = password;
    }

    public LoginRequest(String collegeEmail, String registerNumber, String password) {
        this.collegeEmail = collegeEmail;
        this.registerNumber = registerNumber;
        this.password = password;
    }

    public String getCollegeEmail() {
        return collegeEmail;
    }

    public void setCollegeEmail(String collegeEmail) {
        this.collegeEmail = collegeEmail;
    }

    public String getRegisterNumber() {
        return registerNumber;
    }

    public void setRegisterNumber(String registerNumber) {
        this.registerNumber = registerNumber;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
