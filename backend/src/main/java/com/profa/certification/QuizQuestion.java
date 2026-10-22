package com.profa.certification;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "quiz_questions")
public class QuizQuestion {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    @Column(nullable = false) String subject;
    @Column(nullable = false) String level;
    @Column(nullable = false) String text;
    /** One answer per line. */
    @Column(nullable = false) String choices;
    @Column(nullable = false) int correctIndex;
    boolean active = true;
    Instant createdAt = Instant.now();

    public UUID getId(){return id;}
    public String getSubject(){return subject;} public void setSubject(String v){subject=v;}
    public String getLevel(){return level;} public void setLevel(String v){level=v;}
    public String getText(){return text;} public void setText(String v){text=v;}
    @JsonIgnore public String getChoices(){return choices;} public void setChoices(String v){choices=v;}
    public List<String> getChoiceList(){return choices == null ? List.of() : List.of(choices.split("\n"));}
    public void setChoiceList(List<String> v){choices = v == null ? null : String.join("\n", v);}
    public int getCorrectIndex(){return correctIndex;} public void setCorrectIndex(int v){correctIndex=v;}
    public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
    public Instant getCreatedAt(){return createdAt;}
}
