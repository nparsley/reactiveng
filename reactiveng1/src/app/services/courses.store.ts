import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, map, shareReplay, tap } from "rxjs/operators";
import { LoadingService } from "../loading/loading.service";
import { MessagesService } from "../messages/messages.service";
import { Course, sortCoursesBySeqNo } from "../model/course";

@Injectable({
  providedIn: 'root'
})
export class CoursesStore  {

  //custom obs
  private subject = new BehaviorSubject<Course[]>([]);

  courses$: Observable<Course[]> = this.subject.asObservable();


  constructor(
    private http: HttpClient,
    private loading: LoadingService,
    private messages: MessagesService
  ) {
    this.loadAllCourses();
  }

  saveCourse(courseId: string, changes: Partial<Course>): Observable<any> {
    const courses = this.subject.getValue();

    const index = courses.findIndex(course => course.id == courseId);
    const newCourse: Course = {
      ...courses[index],
      ...changes
    };

    const newCourses: Course[] = courses.slice(0);

    //save new data
    newCourses[index] = newCourse;

    //emit new value to rest of app
    this.subject.next(newCourses);

    //send changes to backend
    return this.http.put(`/api/courses/${courseId}`, changes)
    .pipe(
      catchError(err => {
        const message = 'could not save course';
        console.log(message, err);
        this.messages.showErrors(message);
        return throwError(err);
      }),
      shareReplay()
    );


  }

  filterByCategory(category: string): Observable<Course[]> {
    return this.courses$
    .pipe(
      map(courses => courses.filter(course => course.category == category)
      .sort(sortCoursesBySeqNo)
      )
    )
  }

  private loadAllCourses() {
    const loadCourses$ = this.http.get<Course[]>('/api/courses')
    .pipe(
      map(response => response["payload"]),
      catchError(err => {
        const message = 'could not load courses';
        this.messages.showErrors(message);
        console.log(message, err);
        return throwError(err);
      }),
      tap(courses => this.subject.next(courses))
    );

    this.loading.showLoaderUntilCompleted(loadCourses$)
    .subscribe();
  }


}
