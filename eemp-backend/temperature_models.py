from pydantic import BaseModel

class CustomTempModelParams(BaseModel):
    u_c: float
    u_v: float
    eta_m: float
    alpha_absorption: float

    def __hash__(self):
        return hash((
            self.u_c,
            self.u_v,
            self.eta_m,
            self.alpha_absorption
        ))
