/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";

import router from "../app/Router.js";

// Simuler l'API
jest.mock("../app/Store.js", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    //1
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    //2
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
    //3 Vérification de la présence d'écouteurs d'événements click sur buttonNewBill et iconEye
    test("Then buttonNewBill and iconEye should have a click event listener", () => {
      // Préparation de l'environnement
      document.body.innerHTML = `
        <div>
          <div data-testid="icon-eye"></div>
          <div data-testid="icon-eye"></div>
          <div data-testid="icon-eye"></div>
        </div>
        <button data-testid="btn-new-bill"></button>
      `;
      const mockHandleClickIconEye = jest.fn();
      const bills = new Bills({
        document,
        onNavigate: jest.fn(),
        store: null,
        localStorage: null,
      });

      bills.handleClickIconEye = mockHandleClickIconEye;

      // Vérification des événements click
      const iconEyeElements = screen.getAllByTestId("icon-eye");
      iconEyeElements.forEach((icon) => {
        icon.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(mockHandleClickIconEye).toHaveBeenCalledTimes(
        iconEyeElements.length
      );

      // Sélectionner l'élément bouton
      const buttonNewBill = screen.getByTestId("btn-new-bill");

      // Simuler un clic sur le bouton
      buttonNewBill.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(bills.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
    });
    //4 Vérification du bon fonctionnement de la fonction handleClickIconEye
    test("Then function handleClickIconEye wokrs", () => {
      // Préparation de l'interface utilisateur
      document.body.innerHTML = `
      <style>
      #modaleFile {
          width: 100px;
      }
  </style>
      <div data-testid="icon-eye" data-bill-url="LaDataURL"></div>
      <div id="modaleFile"><div class="modal-body"></div></div>
  `;
      const bills = new Bills({
        document,
        onNavigate: jest.fn(),
        store: null,
        localStorage: null,
      });

      // Créez une fonction simulée pour .modal('show') et l'ignorer
      $.fn.modal = jest.fn();

      // Simulation du clic sur l'icône eye
      const iconEyeElements = screen.getByTestId("icon-eye");
      iconEyeElements.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Vérification des éléments dans la modale
      const modalBody = $("#modaleFile").find(".modal-body");
      const imgElement = modalBody.find("img");

      // Vérifie la largeur de l'image
      expect(imgElement.attr("width")).toBe("50");
      // Vérifie l'URL de l'image
      expect(imgElement.attr("src")).toBe("LaDataURL");
    });
    //5 Tests de gestion des erreurs de l'API
    describe("Testing API error handling", () => {
      beforeEach(() => {
        // Nettoyer le corps du document et préparer l'environnement
        document.body.innerHTML = "";
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });
      // Vérifie si l'erreur 404 s'affiche correctement
      test("Checking 404 error message when fetching bills from API fails", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });
      // Vérifie si l'erreur 500 s'affiche correctement
      test("Checking 500 error message when fetching messages from API fails", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const errorMessage = await screen.getByText(/Erreur 500/);
        expect(errorMessage).toBeTruthy();
      });
    });
  });
});
