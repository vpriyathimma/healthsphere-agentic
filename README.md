# HealthSphere Agentic

AI agents operating within the HealthSphere hospital management domain, governed by Reva.

## Architecture

- **AWS AgentCore Runtime** (us-west-2): 3 Strands agents (Clinical Orders, Records, Admissions)
- **AgentCore Gateway**: 11 MCP tools (Lambda functions)
- **AgentCore Identity**: Cognito inbound auth, OBO for downstream APIs
- **Reva Governance**: Cedar PDP, TrAT, HITL, Intent Drift, NHI Discovery, CFR 11 Audit
- **Render**: Reva backend + Dashboard

## Agents

| Agent | Purpose | Delegates To |
|-------|---------|-------------|
| Clinical Orders | Place/sign lab, med, imaging orders | Records Agent |
| Records | Fetch patient data, vitals, results | — |
| Admissions | Admit, discharge, transfer | Records Agent |

## Users (from HealthSphere roster)

| Name | Role | Department |
|------|------|-----------|
| Emma Davis | Doctor | Cardiology |
| David Brown | Doctor | Orthopedics |
| Sarah Johnson | Doctor | Neurology |
| Lily Armstrong | Nurse | Pediatrics |
| James Porter | Nurse | Emergency Care |
| Ava Mitchell | Nurse | Surgical Ward |
| John Smith | Nurse | Intensive Care Unit |
| Mike Wilson | Nurse | General Medicine |
| Ethan Cooper | Patient | General Ward (Inpatient) |
| Mia Harrison | Patient | General Ward (Inpatient) |
| Lucas Bennett | Patient | General Ward (Inpatient) |
| Grace Whitmore | Patient | General Ward (Inpatient) |
| Oliver Carter | Patient | OPD (Outpatient) |
| Sophia Reynolds | Patient | OPD (Outpatient) |
| Daniel Brooks | Patient | OPD (Outpatient) |
