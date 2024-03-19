/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";

import router from "../app/Router.js";
import { ROUTES, ROUTES_PATH} from "../constants/routes.js";

// Simuler l'API
jest.mock("../app/Store.js", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    let newBill; 

    beforeEach(() => {
      document.body.innerHTML = NewBillUI();

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });
    });

    test("Then I am able to upload an image with jpg, jpeg, png extensions.", async () => {
      // Obtenir l'entrée de fichier
      const fileInput = screen.getByTestId("file");
      const testFile = "some file content";


      // Créer un objet "blob" pour pouvoir avoir un fichier
      const blob = new Blob([testFile]);
      const mockFile = new File([blob], "essai.jpg", {
        type: "image/jpeg",
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await newBill.handleChangeFile({
        target: fileInput,
        preventDefault: jest.fn(),
      });

      expect(fileInput.files.length).toBe(1);
      expect(newBill.fileName).toBe("essai.jpg");
    });

    test("then I can't upload files with invalid extensions.", async () => {
      const fileInput = screen.getByTestId("file");
      // Créer un fichier simulé avec une extension non valide (.pdf)
      const testFile = "some file content";
      // Créer un objet "blob" pour pouvoir avoir un fichier
      const blob = new Blob([testFile]);
      const mockFile = new File([blob], "sample.pdf", {
        type: "application/pdf",
      });


      // Télécharger le fichier
      userEvent.upload(fileInput, mockFile);

      await newBill.handleChangeFile({
        target: fileInput,
        preventDefault: jest.fn(),
      });

      // Vérifier si la valeur de l'entrée de fichier a été vidée, ce qui indique que le fichier a été rejeté
      expect(fileInput.value).toBe("");
    });

    test("Then handleSubmit function should be called on submit", () => {
      let newBillForm = screen.getByTestId("form-new-bill");

      const mockHandleSubmit = jest.fn();
      newBill.handleSubmit = mockHandleSubmit;

      newBillForm.addEventListener("submit", newBill.handleSubmit);

      fireEvent.submit(newBillForm);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    test("then I can't submit the form if the date field is empty", () => {
      const datePicker = screen.getByTestId("datepicker");
      const submitButton = screen.getByText("Envoyer");

      // Espionner handleSubmit pour vérifier s'il est appelé
      jest.spyOn(newBill, "handleSubmit");

      userEvent.clear(datePicker);

      // Stimuler le clic sur soumettre avec un champ de date vide
      fireEvent.click(submitButton);

      console.log(datePicker, "submitButton clicked with empty date field");
      expect(newBill.handleSubmit).not.toHaveBeenCalled();
    });
  });
});

// test d'intégration POST
describe("Given I am a user connected as Employee", () => {
  beforeEach(() => {
    Object.defineProperty(
      window,
      'localStorage',
      { value: localStorageMock }
    )

    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: "john@smith"
    }))
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.appendChild(root)
    router()
  })

  describe("When navigating to the NewBill page", () => {
    test("Then it should create a new bill via mock API POST", async () => {
      document.body.innerHTML = NewBillUI()
      const spy = jest.spyOn(mockStore, "bills")
      const billdata = {
        status: "pending",
        pct: 15,
        amount: 150,
        email: "john@smith",
        name: "business trip",
        vat: "20",
        fileName: "receipt.jpg",
        date: "2023-12-15",
        commentary: "business trip expenses",
        type: "Transportation",
        fileUrl: "receipt.jpg"
      }
      
      
      mockStore.bills().create(billdata)
      
      expect(spy).toHaveBeenCalledTimes(1)
      expect(billdata.fileUrl).toBe("receipt.jpg")
    })
  })

  describe("When an error occurs on the API", () => {
    test("Then it should fail with a 404 error message", async () => {      
      jest.spyOn(mockStore, "bills")
      const rejected = mockStore.bills.mockImplementationOnce(() => {
        return {
          create: () => {return Promise.reject(new Error("Erreur 404"))}
        }
      })

      window.onNavigate(ROUTES_PATH.NewBill)
      await new Promise(process.nextTick);

      expect(rejected().create).rejects.toEqual(new Error("Erreur 404"))
    })
    
    test("Then it should attempt to create a new bill via the API and fail with a 500 error message", async () => {
      jest.spyOn(mockStore, "bills")
      const rejected = mockStore.bills.mockImplementationOnce(() => {
        return {
          create: () => {return Promise.reject(new Error("Erreur 500"))}
        }
      })

      window.onNavigate(ROUTES_PATH.NewBill)
      await new Promise(process.nextTick);

      expect(rejected().create).rejects.toEqual(new Error("Erreur 500"))
    })
  })
})
