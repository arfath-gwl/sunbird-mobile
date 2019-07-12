import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { TabsPage } from './tabs.page';
import { TranslateModule } from '@ngx-translate/core';
import { CoursesPage } from '../courses/courses.page';
import { RouterLinks } from '../app.constant';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: RouterLinks.RESOURCES,
        children: [
          {
            path: '',
            loadChildren: '../resources/resources.module#ResourcesModule'
          }
        ]
      },
      {
        path: 'courses',
        children: [
          {
            path: '',
            loadChildren: '../courses/courses.module#CoursesPageModule'
          }
        ]
      },
      {
        path: 'guest-profile',
        children: [
          {
            path: '',
            loadChildren: '../profile/guest-profile/guest-profile.module#GuestProfilePageModule'
          }
        ]
      },
      {
        path: 'download-manager',
        children: [
          {
            path: '',
            loadChildren: '../download-manager/download-manager.module#DownloadManagerPageModule'
          }
        ]
      },
      {
        path: '',
        redirectTo: 'resources',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild()
  ],
  declarations: [TabsPage]
})
export class TabsPageModule { }