import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';

import { OnboardingPage } from './onboarding';
import { TranslateModule } from '@ngx-translate/core';
import { ContainerService } from 'sunbird';

@NgModule({
  declarations: [
    OnboardingPage
  ],
  imports: [
    IonicPageModule.forChild(OnboardingPage),
    TranslateModule.forChild()
  ],
  exports: [
    OnboardingPage
  ],
  providers: [
  ]
})
export class OnboardingPageModule {}
