# **SWE 4663 – Software Project Management** {#swe-4663-–-software-project-management}

## **Quick Plan (QP)** {#quick-plan-(qp)}

---

## **Project Title** {#project-title}

# *Helm*

---

## **Team Information** {#team-information}

* **Group Number:** 5  
* **Team Leader (Tentative):** Andrew McDaniel  
* **Team Members:**  
  * Andrew McDaniel  
  * Kevin Lara  
  * Jay Lee  
  * Dylan McKee  
  * Daija McLee

**Contribution Status (Initial, subject to revision):**

* All members: **A – Did their share**

[**SWE 4663 – Software Project Management	1**](#swe-4663-–-software-project-management)

[Quick Plan (QP)	1](#quick-plan-\(qp\))

[Project Title	1](#project-title)

[Team Information	1](#team-information)

[1\. Introduction	2](#1.-introduction)

[2\. Project Description and Scope	2](#2.-project-description-and-scope)

[2.1 Target Users	2](#2.1-target-users)

[2.2 Functional Scope (Included Features)	3](#2.2-functional-scope-\(included-features\))

[2.3 Out of Scope (Initial Release / MVP)	3](#2.3-out-of-scope-\(initial-release-/-mvp\))

[3\. Technical and Platform Assumptions	4](#3.-technical-and-platform-assumptions)

[4\. Effort and Resource Estimation	4](#4.-effort-and-resource-estimation)

[4.1 Schedule Duration	4](#4.1-schedule-duration)

[4.2 Team Effort Assumptions	4](#4.2-team-effort-assumptions)

[4.3 Total Estimated Effort	4](#4.3-total-estimated-effort)

[5\. Development Process and Schedule	4](#5.-development-process-and-schedule)

[6\. Risks and Assumptions	5](#6.-risks-and-assumptions)

[6.1 Key Risks	5](#6.1-key-risks)

[6.2 Assumptions	5](#6.2-assumptions)

[7\. Deliverables	5](#7.-deliverables)

[8\. References	5](#8.-references)

## **1\. Introduction** {#1.-introduction}

Helm is a project management system designed to streamline the planning, tracking, and management of software development projects. It combines an intuitive user interface with core project management capabilities, including requirements tracking, effort estimation, and feature management. Helm is built by software developers for software developers, with a focus on simplicity, clarity, and practicality for small teams.

The purpose of this project is to apply software project management concepts learned in SWE 4663 by planning and developing a functional project management system that tracks requirements, effort, and risks for a software project.

---

## **2\. Project Description and Scope** {#2.-project-description-and-scope}

### **2.1 Target Users** {#2.1-target-users}

Helm is intended for **small software development teams** working collaboratively on a single software project.

### **2.2 Functional Scope (Included Features)** {#2.2-functional-scope-(included-features)}

The system will include all required features as specified in the course project guidelines:

**General Project Information**

* High-level project description  
* Project owner or project manager name  
* List of project team members (modifiable over time)  
* List of project risks and current risk status

**Requirements Management**

* Entry and management of functional requirements  
* Entry and management of non-functional requirements

**Effort Monitoring and Tracking**

* Entry of effort data on a daily or weekly basis  
* Effort tracked in person-hours per requirement  
* Effort categories:  
  * Requirements Analysis  
  * Design  
  * Coding  
  * Testing  
  * Project Management  
* Ability to view total accumulated hours by activity and by requirement

**Authentication**

* Basic token-based user authentication  
* No single sign-on (SSO) or OAuth support

### **2.3 Out of Scope (Initial Release / MVP)** {#2.3-out-of-scope-(initial-release-/-mvp)}

The following features are explicitly excluded from the initial implementation:

* Advanced reporting and analytics  
* Real-time updates  
* Support for multiple simultaneous projects per team  
* External integrations

The system will support **one global project shared by all users**.

---

## **3\. Technical and Platform Assumptions** {#3.-technical-and-platform-assumptions}

* Platform: Web application  
* Architecture: Multi-user system with a single global project  
* Backend: Node.js  
* Database: PostgreSQL  
* Frontend and additional frameworks: To be determined

---

## **4\. Effort and Resource Estimation** {#4.-effort-and-resource-estimation}

### **4.1 Schedule Duration** {#4.1-schedule-duration}

* Estimated project duration: **10 weeks**

### **4.2 Team Effort Assumptions** {#4.2-team-effort-assumptions}

* Team size: 5 members  
* Estimated effort per person: **3–5 hours per week**

### **4.3 Total Estimated Effort** {#4.3-total-estimated-effort}

* Minimum estimate: 5 members × 10 weeks × 3 hours/week \= **150 person-hours**  
* Maximum estimate: 5 members × 10 weeks × 5 hours/week \= **250 person-hours**

This estimate is based on prior academic project experience and assumes focused development effort limited to core required features.

---

## **5\. Development Process and Schedule** {#5.-development-process-and-schedule}

Helm will be developed using an **Agile / Iterative process**. Development will be organized into short iterations, allowing for incremental implementation of features and continuous refinement based on progress and constraints.

High-level phases include:

* Requirements clarification and initial planning  
* Core feature implementation  
* Integration and refinement  
* Testing and stabilization

---

## **6\. Risks and Assumptions** {#6.-risks-and-assumptions}

### **6.1 Key Risks** {#6.1-key-risks}

1. **Time Constraints:** All team members are full-time students and employed full-time, which may lead to scheduling conflicts.  
2. **Uneven Contribution:** Due to time limitations, differences in availability may result in uneven workload distribution.  
3. **Technical Experience Variability:** Team members may have varying levels of experience with the chosen technology stack.  
4. **Scope Creep:** Additional features or refinements may be requested beyond the initially defined scope.

### **6.2 Assumptions** {#6.2-assumptions}

* All team members remain enrolled and available throughout the project duration  
* Required development tools and platforms remain accessible  
* The project scope remains consistent with the Quick Plan

---

## **7\. Deliverables** {#7.-deliverables}

Major external deliverables for this project include:

* Quick Plan document  
* Comprehensive Plan document  
* Source code for the Helm web application  
* Final project submission as required by the course

---

## **8\. References** {#8.-references}

* SWE 4663 Term Project Guidelines provided by the course instructor

