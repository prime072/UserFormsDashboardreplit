import { useState, useCallback, useContext, createContext, useEffect, ReactNode, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GridConfig, Form, FormResponse } from "@shared/schema";
import XLSX from "xlsx";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } from "docx";

// ... (keeping all the existing code up to the PDF function)
