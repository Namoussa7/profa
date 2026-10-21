package com.profa.document;

import jakarta.persistence.*;
import java.util.UUID;

/** PDF bytes, kept apart from TeacherDocument so listing documents never loads file contents. */
@Entity
@Table(name = "document_files")
public class DocumentFile {
    @Id UUID documentId;
    @Column(nullable = false) byte[] data;

    public DocumentFile() {}

    public DocumentFile(UUID documentId, byte[] data) {
        this.documentId = documentId;
        this.data = data;
    }

    public UUID getDocumentId(){return documentId;}
    public byte[] getData(){return data;} public void setData(byte[] v){data=v;}
}
