# **SWE 4663 – Software Project Management** {#swe-4663-–-software-project-management}

## **Comprehensive Plan (CP)** {#comprehensive-plan-(cp)}

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

[SWE 4663 – Software Project Management](#swe-4663-–-software-project-management)

[Comprehensive Plan (CP)](#comprehensive-plan-\(cp\))

[Project Title](#project-title)

[Team Information](#team-information)

[1\. Introduction (Expanded from QP)](#1.-introduction-\(expanded-from-qp\))

[1.1 Purpose of the Project](#1.1-purpose-of-the-project)

[1.2 Project Objectives](#1.2-project-objectives)

[1.3 Document Overview](#1.3-document-overview)

[2\. Project Overview and Scope (Expanded from QP)](#2.-project-overview-and-scope-\(expanded-from-qp\))

[2.1 System Overview](#2.1-system-overview)

[2.2 Target Users and Stakeholders](#2.2-target-users-and-stakeholders)

[2.3 In-Scope Features](#2.3-in-scope-features)

[2.4 Out-of-Scope Features](#2.4-out-of-scope-features)

[2.5 Constraints](#2.5-constraints)

[3\. System Requirements (Expanded from QP)](#3.-system-requirements-\(expanded-from-qp\))

[3.1 Functional Requirements](#3.1-functional-requirements)

[3.2 Non-Functional Requirements](#3.2-non-functional-requirements)

[3.3 Assumptions and Dependencies](#3.3-assumptions-and-dependencies)

[4\. Software Engineering Process (Expanded from QP)](#4.-software-engineering-process-\(expanded-from-qp\))

[4.1 Selected Process Model](#4.1-selected-process-model)

[4.2 Process Rationale](#4.2-process-rationale)

[4.3 Iteration Structure](#4.3-iteration-structure)

[4.4 Roles and Responsibilities](#4.4-roles-and-responsibilities)

[4.5 Process Monitoring and Control](#4.5-process-monitoring-and-control)

[5\. Work Breakdown Structure (WBS) (New)](#5.-work-breakdown-structure-\(wbs\)-\(new\))

[6\. Schedule and Milestones (Expanded from QP)](#6.-schedule-and-milestones-\(expanded-from-qp\))

[6.1 Project Schedule](#6.1-project-schedule)

[6.2 Milestones](#6.2-milestones)

[6.3 Schedule Rationale](#6.3-schedule-rationale)

[7\. Effort, Cost, and Resource Estimation (Expanded from QP)](#7.-effort,-cost,-and-resource-estimation-\(expanded-from-qp\))

[7.1 Estimation Approach](#7.1-estimation-approach)

[7.2 Total Effort Summary](#7.2-total-effort-summary)

[7.3 Effort Distribution by Project Phase](#7.3-effort-distribution-by-project-phase)

[7.4 Effort Allocation by Work Breakdown Structure](#7.4-effort-allocation-by-work-breakdown-structure)

[7.5 Resource Utilization](#7.5-resource-utilization)

[8\. Risk Management (Expanded from QP)](#8.-risk-management-\(expanded-from-qp\))

[8.1 Risk Identification](#8.1-risk-identification)

[8.2 Risk Analysis and Mitigation](#8.2-risk-analysis-and-mitigation)

[8.3 Risk Monitoring](#8.3-risk-monitoring)

[9\. Quality Assurance and Testing Plan (New)](#9.-quality-assurance-and-testing-plan-\(new\))

[9.1 Quality Objectives](#9.1-quality-objectives)

[9.2 Testing Strategy](#9.2-testing-strategy)

[9.3 Quality Assurance Checklist](#9.3-quality-assurance-checklist)

[10\. Deliverables and Acceptance (Expanded from QP)](#10.-deliverables-and-acceptance-\(expanded-from-qp\))

[11\. Summary and Conclusion (Expanded from QP)](#heading=h.ahe7cju46r79)

[12\. References](#12.-references)

---

## **1\. Introduction (Expanded from QP)** {#1.-introduction-(expanded-from-qp)}

### **1.1 Purpose of the Project** {#1.1-purpose-of-the-project}

The purpose of the Helm project is to design, plan, and develop a software project management system while applying the principles, techniques, and best practices covered in SWE 4663 – Software Project Management. The project serves as a practical exercise in managing a software project from initial planning through implementation, with an emphasis on scope definition, effort estimation, scheduling, risk management, and quality assurance.

Helm is intended to demonstrate how structured project management practices can be applied to a real-world software system, even within the constraints of an academic environment.

### **1.2 Project Objectives** {#1.2-project-objectives}

The primary objectives of the Helm project are to:

* Provide a centralized system for managing software project information  
* Support clear definition and tracking of functional and non-functional requirements  
* Enable accurate logging and analysis of development effort  
* Improve visibility into how time is distributed across project activities  
* Deliver a usable and reliable system appropriate for small software teams

In addition to technical objectives, the project aims to reinforce teamwork, communication, and project coordination skills among team members.

### **1.3 Document Overview** {#1.3-document-overview}

This Comprehensive Plan document expands upon the previously submitted Quick Plan by providing greater detail on system requirements, development process, scheduling, effort estimation, risk management, and quality assurance.

The document is organized to reflect the logical flow of a software project, beginning with project context and scope, followed by requirements, process, planning details, and concluding with quality and risk considerations. This plan serves as the primary reference for guiding development and evaluating project progress.

---

## **2\. Project Overview and Scope (Expanded from QP)** {#2.-project-overview-and-scope-(expanded-from-qp)}

### **2.1 System Overview** {#2.1-system-overview}

Helm is a web-based project management system designed to support small software development teams working on a single shared project. The system provides tools for defining project information, managing requirements, tracking development effort, and monitoring project risks.

Helm focuses on clarity and simplicity rather than extensive customization or advanced analytics. By limiting scope to core project management needs, the system aims to reduce overhead while still providing meaningful insight into project progress and effort allocation.

### **2.2 Target Users and Stakeholders** {#2.2-target-users-and-stakeholders}

**Primary Users**

* Software developers  
* Project managers or team leads  
* Small development teams collaborating on a shared codebase

**Stakeholders**

* Project owner or project manager responsible for overseeing progress  
* Development team members responsible for entering and updating project data  
* Course instructor, acting as an external evaluator of project outcomes

### **2.3 In-Scope Features** {#2.3-in-scope-features}

The following features are included within the defined scope of the Helm project:

* Entry and maintenance of high-level project information  
* Management of project team members  
* Identification and tracking of project risks  
* Management of functional and non-functional requirements  
* Logging of development effort in person-hours  
* Categorization of effort by development activity  
* Aggregation and display of total effort by requirement and activity  
* Basic token-based authentication for access control

### **2.4 Out-of-Scope Features** {#2.4-out-of-scope-features}

To control complexity and ensure successful delivery, the following features are explicitly excluded from scope:

* Advanced reporting or analytics dashboards  
* Real-time collaboration or live updates  
* Support for multiple concurrent projects  
* External system integrations  
* Single sign-on (SSO) or OAuth-based authentication

### **2.5 Constraints** {#2.5-constraints}

The project is subject to the following constraints:

* Fixed academic schedule and submission deadlines  
* Limited weekly availability of team members due to coursework and employment  
* Use of a predefined technology stack (web application using Node.js and PostgreSQL)  
* Scope limited to features committed in this Comprehensive Plan

These constraints were considered when defining scope, schedule, and resource estimates.

---

## **3\. System Requirements (Expanded from QP)** {#3.-system-requirements-(expanded-from-qp)}

This section defines the functional and non-functional requirements for the Helm system. Requirements are written at a level appropriate for a Comprehensive Plan and are uniquely numbered for traceability.

### **3.1 Functional Requirements** {#3.1-functional-requirements}

**FR-1** The system shall allow an authorized user to view a high-level description of the project.

**FR-2** The system shall allow an authorized user to define and update the project owner or project manager.

**FR-3** The system shall allow authorized users to view a list of project team members.

**FR-4** The system shall allow authorized users to add, update, and remove project team members.

**FR-5** The system shall allow authorized users to create and maintain a list of project risks.

**FR-6** The system shall allow authorized users to assign a status to each identified risk.

**FR-7** The system shall allow authorized users to create functional requirements for the project.

**FR-8** The system shall allow authorized users to create non-functional requirements for the project.

**FR-9** The system shall allow authorized users to modify and remove existing requirements.

**FR-10** The system shall allow authorized users to log effort in person-hours on a daily or weekly basis.

**FR-11** The system shall associate logged effort with a specific requirement.

**FR-12** The system shall categorize logged effort into one of the following activity types:

* Requirements Analysis  
* Design  
* Coding  
* Testing  
* Project Management

**FR-13** The system shall calculate total effort expended per requirement.

**FR-14** The system shall calculate total effort expended per activity category.

**FR-15** The system shall display summarized effort data to authorized users.

**FR-16** The system shall require users to authenticate using a token-based authentication mechanism.

**FR-17** The system shall restrict access to project data to authenticated users only.

### **3.2 Non-Functional Requirements** {#3.2-non-functional-requirements}

**NFR-1 (Usability)** The system shall provide a user interface that is intuitive and suitable for small software teams.

**NFR-2 (Performance)** The system shall respond to user actions within a reasonable time under normal usage conditions.

**NFR-3 (Reliability)** The system shall store project data persistently and prevent unintended data loss.

**NFR-4 (Security)** The system shall protect project data using token-based authentication and role-appropriate access control.

**NFR-5 (Maintainability)** The system shall be designed using modular components to support future enhancements.

### **3.3 Assumptions and Dependencies** {#3.3-assumptions-and-dependencies}

* All users have access to a modern web browser.  
* Required development tools and infrastructure remain available.  
* Project scope remains limited to the features defined in this document.

---

## **4\. Software Engineering Process (Expanded from QP)** {#4.-software-engineering-process-(expanded-from-qp)}

This section describes the software engineering process selected for the Helm project, including the rationale for its selection, iteration structure, and team roles.

### **4.1 Selected Process Model** {#4.1-selected-process-model}

The Helm project will follow an **Agile / Iterative software development process**. This approach emphasizes incremental development, frequent review, and adaptability to changing constraints, making it well suited for a small development team operating under academic and time limitations.

Rather than a rigid, document-heavy lifecycle, the Agile / Iterative model allows the team to prioritize core functionality early while refining features over successive iterations.

### **4.2 Process Rationale** {#4.2-process-rationale}

The Agile / Iterative process was selected for the following reasons:

* The project requirements are well-defined at a high level but may evolve in detail during development  
* Team members have limited and varying availability due to academic and work commitments  
* Incremental development reduces risk by enabling early integration and validation  
* Iterative progress allows scope adjustments without jeopardizing core deliverables

This process provides flexibility while still maintaining structure appropriate for a course project.

### **4.3 Iteration Structure** {#4.3-iteration-structure}

Development will be organized into short iterations, each producing a measurable increment of functionality.

Each iteration will typically include:

1. Iteration planning and task selection  
2. Feature implementation  
3. Integration with existing components  
4. Review and refinement

Iterations will focus first on implementing required core features, followed by refinement and stabilization activities.

### **4.4 Roles and Responsibilities** {#4.4-roles-and-responsibilities}

**Team Leader**

* Coordinates overall project activities  
* Facilitates planning and progress tracking  
* Ensures deliverables meet course requirements  
* Serves as the primary point of contact with the instructor

**Development Team Members**

* Implement assigned features and tasks  
* Participate in planning and review activities  
* Assist with testing and documentation

Responsibilities may overlap as needed to ensure timely progress and balanced workload distribution.

### **4.5 Process Monitoring and Control** {#4.5-process-monitoring-and-control}

Project progress will be monitored through:

* Regular team communication  
* Informal progress reviews at the end of each iteration  
* Comparison of completed work against the planned schedule

Any identified delays or issues will be addressed by adjusting task assignments or iteration scope while preserving the committed project features.

## 

## **5\. Work Breakdown Structure (WBS) (New)** {#5.-work-breakdown-structure-(wbs)-(new)}

The Work Breakdown Structure decomposes the Helm project into manageable work packages.

| WBS ID | Work Package | Description |
| ----- | ----- | ----- |
| 1.0 | Project Planning | Planning activities, coordination, and documentation |
| 1.1 | Requirements Definition | Functional and non-functional requirements specification |
| 1.2 | Project Scheduling | Timeline creation and milestone planning |
| 2.0 | System Design | Overall system architecture and data design |
| 2.1 | Backend Design | API design and database schema |
| 2.2 | Frontend Design | UI structure and navigation design |
| 3.0 | Backend Development | Implementation of server-side functionality |
| 3.1 | Authentication | Token-based authentication implementation |
| 3.2 | Requirements Management | CRUD functionality for requirements |
| 3.3 | Effort Tracking | Effort logging and calculations |
| 4.0 | Frontend Development | Implementation of user interface |
| 4.1 | Project Info Views | Project overview and team views |
| 4.2 | Requirements UI | Requirement entry and editing screens |
| 4.3 | Effort Entry UI | Effort logging interfaces |
| 5.0 | Testing | Verification and validation activities |
| 5.1 | Unit Testing | Testing of individual components |
| 5.2 | Integration Testing | Testing interactions between components |
| 6.0 | Documentation | Preparation of project documents |
| 6.1 | Quick Plan | Initial planning document |
| 6.2 | Comprehensive Plan | Detailed planning document |
| 6.3 | Final Submission | Final project documentation and code packaging |

---

## **6\. Schedule and Milestones (Expanded from QP)** {#6.-schedule-and-milestones-(expanded-from-qp)}

The project is planned over a 10-week period using an Agile / Iterative approach.

### **6.1 Project Schedule** {#6.1-project-schedule}

| Week(s) | Activities |
| ----- | ----- |
| 1 | Requirements clarification, planning, and tool setup |
| 2–3 | System design and architecture definition |
| 4–6 | Core feature implementation (backend and frontend) |
| 7–8 | Integration and refinement |
| 9 | Testing and defect resolution |
| 10 | Final stabilization and submission preparation |

### **6.2 Milestones** {#6.2-milestones}

| Milestone | Target Time |
| ----- | ----- |
| Requirements finalized | End of Week 1 |
| Design completed | End of Week 3 |
| Core functionality implemented | End of Week 6 |
| Integration completed | End of Week 8 |
| Testing completed | End of Week 9 |
| Final submission | End of Week 10 |

### **6.3 Schedule Rationale** {#6.3-schedule-rationale}

This schedule aligns with the Agile development process by allowing iterative development while providing buffer time for academic and work-related constraints.

---

## **7\. Effort, Cost, and Resource Estimation (Expanded from QP)** {#7.-effort,-cost,-and-resource-estimation-(expanded-from-qp)}

This section refines the effort estimation presented in the Quick Plan by distributing estimated effort across project phases and work packages.

### **7.1 Estimation Approach** {#7.1-estimation-approach}

Effort estimation for the Helm project is based on:

* Prior academic software project experience  
* The defined project scope and feature set  
* The selected Agile / Iterative development process

Estimates are expressed in **person-hours** and represent reasonable approximations rather than exact measurements.

### **7.2 Total Effort Summary** {#7.2-total-effort-summary}

* Team size: 5 members  
* Project duration: 10 weeks  
* Estimated effort per person: 3–5 hours per week

**Total estimated effort range:**

* Minimum: **150 person-hours**  
* Maximum: **250 person-hours**

For planning purposes, the project will target a **nominal estimate of approximately 200 person-hours**.

### **7.3 Effort Distribution by Project Phase** {#7.3-effort-distribution-by-project-phase}

| Phase | Estimated Effort (%) | Estimated Hours (Approx.) |
| :---- | :---- | :---- |
| Planning and Requirements | 15% | 30 hours |
| System Design | 15% | 30 hours |
| Implementation | 40% | 80 hours |
| Testing and Integration | 20% | 40 hours |
| Documentation and Submission | 10% | 20 hours |
| **Total** | **100%** | **200 hours** |

This distribution reflects the emphasis on implementation while allocating sufficient time for planning, testing, and documentation.

### **7.4 Effort Allocation by Work Breakdown Structure** {#7.4-effort-allocation-by-work-breakdown-structure}

Effort is further distributed across major WBS elements as follows:

| WBS ID | Work Package | Estimated Hours |
| :---- | :---- | :---- |
| 1.0 | Project Planning and Requirements | 30 |
| 2.0 | System Design | 30 |
| 3.0 | Backend Development | 50 |
| 4.0 | Frontend Development | 30 |
| 5.0 | Testing | 40 |
| 6.0 | Documentation | 20 |
| **Total** |  | **200** |

### 

### **7.5 Resource Utilization** {#7.5-resource-utilization}

All team members are expected to contribute across multiple phases of the project. While specific task ownership may vary, effort is assumed to be distributed evenly across the team.

Adjustments to individual task assignments may be made to address scheduling constraints or skill differences while maintaining overall effort balance.

---

## **8\. Risk Management (Expanded from QP)** {#8.-risk-management-(expanded-from-qp)}

Effective risk management is critical to the success of the Helm project. This section identifies key project risks, evaluates their likelihood and impact, and outlines mitigation strategies.

### **8.1 Risk Identification** {#8.1-risk-identification}

The primary risks for this project stem from scheduling constraints, team dynamics, technical uncertainty, and scope control.

### **8.2 Risk Analysis and Mitigation** {#8.2-risk-analysis-and-mitigation}

| Risk ID | Risk Description | Likelihood | Impact | Mitigation Strategy |
| :---- | :---- | :---- | :---- | :---- |
| R-1 | Team members balancing full-time employment and full-time coursework may experience time conflicts | High | High | Use an Agile iterative schedule, prioritize core features early, and maintain flexible task assignments |
| R-2 | Uneven contribution among team members due to availability differences | Medium | High | Regular communication, transparent task tracking, and early intervention by the team leader |
| R-3 | Varying levels of experience with the selected technology stack | Medium | Medium | Early identification of skill gaps, peer support, and focusing on familiar technologies where possible |
| R-4 | Scope creep due to additional features or refinements | Medium | High | Clearly defined scope, explicit out-of-scope features, and change control through team agreement |

### **8.3 Risk Monitoring** {#8.3-risk-monitoring}

Risks will be reviewed periodically during development iterations. If a risk increases in likelihood or impact, mitigation actions will be adjusted to minimize negative effects on project delivery.

---

## **9\. Quality Assurance and Testing Plan (New)** {#9.-quality-assurance-and-testing-plan-(new)}

This section outlines the quality objectives and testing approach for the Helm project to ensure the delivered system meets functional, usability, and reliability expectations.

### **9.1 Quality Objectives** {#9.1-quality-objectives}

The primary quality objectives for Helm are:

* Correct implementation of all committed functional requirements  
* Accurate effort tracking and calculation  
* Usable and intuitive interfaces for small development teams  
* Stable and reliable system behavior

  ### **9.2 Testing Strategy** {#9.2-testing-strategy}

Testing activities will be integrated throughout development and will include:

* Unit testing of individual backend components  
* Integration testing between backend services and the database  
* Functional testing of user-facing features  
* Manual system testing prior to final submission

  ### **9.3 Quality Assurance Checklist** {#9.3-quality-assurance-checklist}

The following checklist will be used to verify system readiness prior to submission:

| QA Item | Description | Status |
| :---- | :---- | :---- |
| QA-1 | All functional requirements implemented and verified | Pending |
| QA-2 | Authentication mechanism functions correctly | Pending |
| QA-3 | Effort logging correctly records and categorizes hours | Pending |
| QA-4 | Effort totals are calculated accurately | Pending |
| QA-5 | Core user workflows tested end-to-end | Pending |
| QA-6 | No critical defects remain unresolved | Pending |
| QA-7 | Documentation is complete and consistent | Pending |

Items will be reviewed and marked complete prior to final project submission.

---

## **10\. Deliverables and Acceptance (Expanded from QP)** {#10.-deliverables-and-acceptance-(expanded-from-qp)}

10.1 Deliverables

* Planning documents  
* Source code  
* Final product

10.2 Acceptance Criteria

* Alignment with stated scope  
* Compliance with course requirements

---

## **11\. Summary and Conclusion (Expanded from QP)**

This Comprehensive Plan has presented a detailed management and development strategy for the Helm project. Helm is a web-based project management system designed to support small software development teams by providing clear visibility into project requirements, effort tracking, and risk management. The project was defined with a focused scope to ensure successful delivery within the constraints of an academic term.

The plan expanded upon the initial Quick Plan by refining system requirements, defining an Agile / Iterative development process, establishing a realistic project schedule, and distributing effort across clearly defined work packages. Functional and non-functional requirements were enumerated to provide traceability, while the Work Breakdown Structure and effort estimates ensure that development activities are manageable and measurable.

Key project risks, including time constraints, uneven contribution, technical variability, and scope creep, were identified and accompanied by mitigation strategies to reduce their potential impact. A quality assurance and testing plan was also defined to ensure that the final system meets functional, usability, and reliability expectations prior to submission.

Overall, this Comprehensive Plan serves as a structured roadmap for guiding the development of Helm from planning through implementation and final delivery. By adhering to the defined scope, schedule, and process, the project team is positioned to successfully implement the committed features and demonstrate effective application of software project management principles learned in SWE 4663\.

---

## **12\. References** {#12.-references}

* SWE 4663 Term Project Guidelines

