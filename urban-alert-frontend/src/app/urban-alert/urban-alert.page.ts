import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-urban-alert',
  templateUrl: './urban-alert.page.html',
  styleUrls: ['./urban-alert.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class UrbanAlertPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
